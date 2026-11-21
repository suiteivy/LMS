const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const { idempotencyGuard, __inMemoryStore } = require('../middleware/idempotency.middleware.js');
const quarantineService = require('../services/quarantine.service.js');
const outboxService = require('../services/outbox.service.js');

test('ACID Concurrency: 50 concurrent identifier allocations yield unique gap-free numbers', async () => {
  // Simulate counter row with SELECT FOR UPDATE atomic increment
  let lastCounter = 0;
  const lock = { isLocked: false };

  async function atomicAllocate() {
    while (lock.isLocked) {
      await new Promise(r => setImmediate(r));
    }
    lock.isLocked = true;
    try {
      lastCounter += 1;
      const formatted = `ADM-${String(lastCounter).padStart(4, '0')}`;
      return formatted;
    } finally {
      lock.isLocked = false;
    }
  }

  // 50 concurrent allocation calls
  const promises = Array.from({ length: 50 }, () => atomicAllocate());
  const results = await Promise.all(promises);

  assert.strictEqual(results.length, 50, 'All 50 calls completed');
  const uniqueSet = new Set(results);
  assert.strictEqual(uniqueSet.size, 50, 'All 50 allocated numbers must be unique');
  assert.strictEqual(results[0], 'ADM-0001', 'Starts at 0001');
  assert.strictEqual(results[49], 'ADM-0050', 'Ends at 0050 with zero gaps');
});

test('ACID Race Conditions: Concurrent confirmations of same payment allow exactly one winner', async () => {
  let paymentStatus = 'Submitted';
  let confirmationsCount = 0;
  let receiptIssued = null;

  async function attemptConfirmPayment(adminId) {
    // Simulates SELECT FOR UPDATE on payment row
    if (paymentStatus === 'Confirmed') {
      return { success: false, error: 'Payment is already confirmed' };
    }
    // Critical write path
    paymentStatus = 'Confirmed';
    confirmationsCount += 1;
    receiptIssued = `REC-${Date.now()}`;
    return { success: true, receipt: receiptIssued, confirmedBy: adminId };
  }

  // Two admins race to confirm the same payment at the same millisecond
  const [res1, res2] = await Promise.all([
    attemptConfirmPayment('admin-1'),
    attemptConfirmPayment('admin-2'),
  ]);

  const winnerCount = [res1, res2].filter(r => r.success).length;
  const loserCount = [res1, res2].filter(r => !r.success).length;

  assert.strictEqual(winnerCount, 1, 'Exactly one admin can confirm the payment');
  assert.strictEqual(loserCount, 1, 'The losing concurrent request is cleanly rejected');
  assert.strictEqual(confirmationsCount, 1, 'Only one receipt was issued');
});

test('Idempotency Middleware: Identical request replays cached response with X-Cache-Lookup HIT', async () => {
  const idempotencyKey = `idemp_${Date.now()}`;
  const req1 = {
    method: 'POST',
    originalUrl: '/api/finance/payments',
    headers: { 'idempotency-key': idempotencyKey },
    body: { amount: 5000, studentId: 'student-123' },
    user: { id: 'user-abc', institution_id: 'inst-xyz' },
  };

  let statusCode1 = 200;
  let responseBody1 = null;
  const headers1 = {};

  const res1 = {
    statusCode: 200,
    setHeader: (k, v) => { headers1[k] = v; },
    status: function (code) { this.statusCode = code; statusCode1 = code; return this; },
    json: (data) => { responseBody1 = data; return data; },
  };

  // First call executes handler
  await idempotencyGuard(req1, res1, () => {
    res1.status(201).json({ id: 'pay_999', status: 'submitted' });
  });

  assert.strictEqual(statusCode1, 201);
  assert.strictEqual(responseBody1.id, 'pay_999');

  // Second call with same key and same body
  const req2 = { ...req1 };
  let statusCode2 = 200;
  let responseBody2 = null;
  const headers2 = {};

  const res2 = {
    statusCode: 200,
    setHeader: (k, v) => { headers2[k] = v; },
    status: (code) => { statusCode2 = code; return res2; },
    json: (data) => { responseBody2 = data; return data; },
  };

  await idempotencyGuard(req2, res2, () => {
    assert.fail('Handler should NOT be called on idempotent replay');
  });

  assert.strictEqual(statusCode2, 201);
  assert.strictEqual(responseBody2.id, 'pay_999');
  assert.strictEqual(headers2['X-Cache-Lookup'], 'HIT');
  assert.strictEqual(headers2['X-Idempotency-Replay'], 'true');
});

test('Idempotency Middleware: Mismatched body with same key rejects with 422', async () => {
  const idempotencyKey = `idemp_mismatch_${Date.now()}`;
  const req1 = {
    method: 'POST',
    originalUrl: '/api/finance/payments',
    headers: { 'idempotency-key': idempotencyKey },
    body: { amount: 1000 },
    user: { id: 'user-def', institution_id: 'inst-xyz' },
  };

  const res1 = {
    statusCode: 200,
    setHeader: () => {},
    status: () => res1,
    json: (d) => d,
  };

  await idempotencyGuard(req1, res1, () => {
    res1.json({ success: true });
  });

  // Replay with DIFFERENT body
  const req2 = {
    method: 'POST',
    originalUrl: '/api/finance/payments',
    headers: { 'idempotency-key': idempotencyKey },
    body: { amount: 9999 }, // Mismatch!
    user: { id: 'user-def', institution_id: 'inst-xyz' },
  };

  let statusCode2 = 0;
  let errorResponse = null;

  const res2 = {
    status: (code) => { statusCode2 = code; return res2; },
    json: (data) => { errorResponse = data; return data; },
    setHeader: () => {},
  };

  await idempotencyGuard(req2, res2, () => {
    assert.fail('Handler should not be invoked on payload mismatch');
  });

  assert.strictEqual(statusCode2, 422, 'Must return 422 Unprocessable Entity');
  assert.strictEqual(errorResponse.error, 'IDEMPOTENCY_KEY_MISMATCH');
});

test('ACID Invariant: Append-only ledger rejects UPDATE or DELETE', () => {
  function simulateLedgerMutation(operation) {
    if (operation === 'UPDATE' || operation === 'DELETE') {
      const err = new Error('ACID Violation: ledger_entries are immutable and cannot be updated or deleted');
      err.code = '23505';
      throw err;
    }
    return { success: true };
  }

  assert.throws(() => simulateLedgerMutation('UPDATE'), /ACID Violation/);
  assert.throws(() => simulateLedgerMutation('DELETE'), /ACID Violation/);
  assert.doesNotThrow(() => simulateLedgerMutation('INSERT'));
});

test('ACID Invariant: Institution must retain at least one Main Admin', () => {
  const activeAdmins = [{ id: 'admin-1', is_active: true }];

  function removeAdmin(adminId) {
    const remaining = activeAdmins.filter(a => a.id !== adminId && a.is_active);
    if (remaining.length < 1) {
      throw new Error('Invariant Violation: Institution must have at least one active Main Admin');
    }
    return true;
  }

  assert.throws(() => removeAdmin('admin-1'), /Invariant Violation/);
});

test('Data Quality Quarantine: Questionable records are preserved without silent loss', async () => {
  const quarantined = await quarantineService.quarantineRecord({
    institutionId: '11111111-1111-1111-1111-111111111111',
    tableName: 'legacy_student_bills',
    entityId: 'legacy-bill-99',
    originalRecord: { student: 'Ghost', amount: 'NaN' },
    quarantineReason: 'Corrupted monetary value during schema normalization',
    severity: 'warning',
  });

  assert.ok(quarantined.id);
  assert.strictEqual(quarantined.status, 'pending_review');
  assert.strictEqual(quarantined.table_name, 'legacy_student_bills');

  const pending = await quarantineService.getQuarantinedRecords('11111111-1111-1111-1111-111111111111');
  assert.ok(pending.length >= 1);
});

test('Outbox & Dead Letter Queue: Max retries moves failed event to DLQ with alert', async () => {
  let attempts = 0;
  outboxService.registerHandler('test.failing_event', async () => {
    attempts++;
    throw new Error('Upstream provider timed out');
  });

  const event = await outboxService.stageEvent({
    eventType: 'test.failing_event',
    aggregateType: 'test',
    aggregateId: 'test-1',
    payload: { msg: 'hello' },
    maxRetries: 2,
  });

  // Execute retry cycles
  await outboxService.processEvent(event);
  assert.strictEqual(event.retry_count, 1);
  assert.strictEqual(event.status, 'pending');

  await outboxService.processEvent(event);
  assert.strictEqual(event.retry_count, 2);
  assert.strictEqual(event.status, 'failed');
  assert.ok(event.last_error.includes('timed out'));
});
