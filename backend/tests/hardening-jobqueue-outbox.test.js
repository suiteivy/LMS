const test = require('node:test');
const assert = require('node:assert/strict');
const jobQueueService = require('../services/jobQueue.service.js');
const outboxService = require('../services/outbox.service.js');

test('JobQueue: executes job successfully and marks completed', async () => {
  let executedPayload = null;
  jobQueueService.registerHandler('test_success_job', async (payload) => {
    executedPayload = payload;
    return { processed: true };
  });

  const { id } = await jobQueueService.enqueue({
    jobType: 'test_success_job',
    payload: { studentId: 'st-101', score: 95 },
  });

  const job = await jobQueueService.getJobStatus(id);
  assert.equal(job.status, 'queued');

  await jobQueueService.processJob(job);

  const updatedJob = await jobQueueService.getJobStatus(id);
  assert.equal(updatedJob.status, 'completed');
  assert.deepEqual(executedPayload, { studentId: 'st-101', score: 95 });
  assert.equal(updatedJob.result.processed, true);
});

test('JobQueue: idempotencyKey returns existing job without duplicate insertion', async () => {
  const key = `idemp_${Date.now()}`;
  const job1 = await jobQueueService.enqueue({
    jobType: 'test_idemp_job',
    payload: { action: 'promote' },
    idempotencyKey: key,
  });

  assert.equal(job1.duplicate, false);

  const job2 = await jobQueueService.enqueue({
    jobType: 'test_idemp_job',
    payload: { action: 'promote' },
    idempotencyKey: key,
  });

  assert.equal(job2.duplicate, true);
  assert.equal(job2.id, job1.id);
});

test('JobQueue: non-retryable error routes immediately to dead_letter', async () => {
  jobQueueService.registerHandler('test_non_retryable_job', async () => {
    const err = new Error('Invalid format');
    err.statusCode = 400; // non-retryable
    throw err;
  });

  const { id } = await jobQueueService.enqueue({
    jobType: 'test_non_retryable_job',
    payload: {},
  });

  const job = await jobQueueService.getJobStatus(id);
  await jobQueueService.processJob(job);

  const failedJob = await jobQueueService.getJobStatus(id);
  assert.equal(failedJob.status, 'dead_letter');
  assert.match(failedJob.last_error, /Invalid format/);
});

test('JobQueue: retryable error applies exponential backoff and increments attempts', async () => {
  jobQueueService.registerHandler('test_retryable_job', async () => {
    const err = new Error('Connection timeout');
    err.statusCode = 503;
    throw err;
  });

  const { id } = await jobQueueService.enqueue({
    jobType: 'test_retryable_job',
    payload: {},
    maxAttempts: 3,
  });

  const job = await jobQueueService.getJobStatus(id);
  await jobQueueService.processJob(job);

  const retryingJob = await jobQueueService.getJobStatus(id);
  assert.equal(retryingJob.status, 'queued');
  assert.equal(retryingJob.attempts, 1);
  assert.ok(new Date(retryingJob.run_at).getTime() > Date.now());
});

test('Outbox: stages event and processes handler to completed status', async () => {
  let dispatchedPayload = null;
  outboxService.registerHandler('test_outbox_event', async (payload) => {
    dispatchedPayload = payload;
  });

  const staged = await outboxService.stageEvent({
    eventType: 'test_outbox_event',
    aggregateType: 'order',
    aggregateId: 'ord-123',
    payload: { amount: 500, currency: 'KES' },
  });

  assert.equal(staged.status, 'pending');

  await outboxService.processEvent(staged);

  assert.equal(staged.status, 'completed');
  assert.deepEqual(dispatchedPayload, { amount: 500, currency: 'KES' });
  assert.ok(staged.processed_at);
});
