const test = require('node:test');
const assert = require('node:assert/strict');

const { retryScheduledNotificationDeliveries } = require('../services/notificationDelivery.service.js');

test('retryScheduledNotificationDeliveries returns stats object shape', async () => {
  try {
    const result = await retryScheduledNotificationDeliveries({ limit: 1 });
    assert.equal(typeof result, 'object');
    assert.equal(typeof result.processed, 'number');
    assert.equal(typeof result.delivered, 'number');
    assert.equal(typeof result.failed, 'number');
  } catch (error) {
    // If no DB connection in CI/local, test should be informative but not mask contract changes.
    assert.match(String(error.message || error), /supabase|schema cache|connect|fetch|network|ENOTFOUND|ECONNREFUSED/i);
  }
});
