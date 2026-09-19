const test = require('node:test');
const assert = require('node:assert/strict');
const metricsCollector = require('../utils/metrics.js');
const configCache = require('../utils/configCache.js');
const { CircuitBreaker, CircuitBreakerOpenError } = require('../utils/circuitBreaker.js');

test('MetricsCollector: accurately tracks latency percentiles and error rates', () => {
  metricsCollector.reset();

  // Record 100 sample latencies (1ms to 100ms)
  for (let i = 1; i <= 100; i++) {
    const status = i > 90 ? 500 : (i > 80 ? 400 : 200);
    metricsCollector.recordRequest(i, status);
  }

  const metrics = metricsCollector.getMetrics();
  assert.equal(metrics.traffic.total_requests, 100);
  assert.equal(metrics.latency_ms.p50, 50);
  assert.equal(metrics.latency_ms.p95, 95);
  assert.equal(metrics.latency_ms.p99, 99);
  assert.equal(metrics.errors.by_status['5xx'], 10);
  assert.equal(metrics.errors.by_status['4xx'], 10);
  assert.equal(metrics.errors.by_status['2xx'], 80);
  assert.equal(metrics.errors.rate_percentage, 20);
});

test('ConfigCache: sets, gets, and respects explicit invalidation with wildcards', () => {
  configCache.clear();

  configCache.set('inst-1:grading_scales', [{ grade: 'A' }], 300);
  configCache.set('inst-1:terms', [{ id: 'term-1' }], 300);
  configCache.set('inst-2:grading_scales', [{ grade: 'B' }], 300);

  assert.deepEqual(configCache.get('inst-1:grading_scales'), [{ grade: 'A' }]);
  assert.deepEqual(configCache.get('inst-1:terms'), [{ id: 'term-1' }]);
  assert.deepEqual(configCache.get('inst-2:grading_scales'), [{ grade: 'B' }]);

  // Invalidate specific key
  configCache.invalidate('inst-1:grading_scales');
  assert.equal(configCache.get('inst-1:grading_scales'), null);
  assert.deepEqual(configCache.get('inst-1:terms'), [{ id: 'term-1' }]);

  // Invalidate wildcard prefix
  configCache.invalidateInstitution('inst-1');
  assert.equal(configCache.get('inst-1:terms'), null);
  // inst-2 untouched
  assert.deepEqual(configCache.get('inst-2:grading_scales'), [{ grade: 'B' }]);
});

test('CircuitBreaker: trips to OPEN after threshold failures and fast-fails', async () => {
  const breaker = new CircuitBreaker({
    name: 'test_breaker',
    failureThreshold: 3,
    cooldownMs: 500,
    isFailure: () => true,
  });

  assert.equal(breaker.state, 'CLOSED');

  const failingCall = async () => {
    throw new Error('Downstream 500 error');
  };

  // Fail 1
  await assert.rejects(async () => breaker.execute(failingCall));
  assert.equal(breaker.state, 'CLOSED');

  // Fail 2
  await assert.rejects(async () => breaker.execute(failingCall));
  assert.equal(breaker.state, 'CLOSED');

  // Fail 3 -> TRIPS
  await assert.rejects(async () => breaker.execute(failingCall));
  assert.equal(breaker.state, 'OPEN');

  // Next call fails fast with CircuitBreakerOpenError without calling action
  let actionCalled = false;
  await assert.rejects(
    async () => breaker.execute(async () => { actionCalled = true; }),
    (err) => {
      assert.ok(err instanceof CircuitBreakerOpenError);
      assert.equal(err.statusCode, 503);
      return true;
    }
  );
  assert.equal(actionCalled, false);
});
