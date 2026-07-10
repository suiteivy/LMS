const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const controllerPath = path.resolve(__dirname, '../controllers/master_admin.controller.js');
const supabaseModulePath = path.resolve(__dirname, '../utils/supabaseClient.js');
const notificationServiceModulePath = path.resolve(__dirname, '../services/notificationDelivery.service.js');

function loadControllerWithMocks({ mockSupabase, mockNotificationService } = {}) {
  delete require.cache[controllerPath];
  delete require.cache[supabaseModulePath];
  delete require.cache[notificationServiceModulePath];

  require.cache[supabaseModulePath] = {
    id: supabaseModulePath,
    filename: supabaseModulePath,
    loaded: true,
    exports: mockSupabase || {},
  };

  require.cache[notificationServiceModulePath] = {
    id: notificationServiceModulePath,
    filename: notificationServiceModulePath,
    loaded: true,
    exports: mockNotificationService || {
      sendBulkInAppNotificationsWithHistory: async () => [],
    },
  };

  return require(controllerPath);
}

function createRes() {
  const state = {
    statusCode: 200,
    body: null,
  };

  return {
    state,
    status(code) {
      state.statusCode = code;
      return this;
    },
    json(payload) {
      state.body = payload;
      return this;
    },
  };
}

test('notifyTarget rejects out-of-range expiry_days with 400', async () => {
  const controller = loadControllerWithMocks();

  const req = {
    body: {
      title: 'Notice',
      message: 'Body',
      target: 'all_admins',
      expiry_days: 0,
    },
  };
  const res = createRes();

  await controller.notifyTarget(req, res);

  assert.equal(res.state.statusCode, 400);
  assert.match(String(res.state.body?.error || ''), /expiry_days/i);
  assert.match(String(res.state.body?.error || ''), /between 1 and 365/i);
});

test('extendNoticeExpiry rejects out-of-range extend_days with 400', async () => {
  const controller = loadControllerWithMocks();

  const req = {
    params: { noticeId: 'notice_123' },
    body: { extend_days: 366 },
  };
  const res = createRes();

  await controller.extendNoticeExpiry(req, res);

  assert.equal(res.state.statusCode, 400);
  assert.match(String(res.state.body?.error || ''), /extend_days/i);
  assert.match(String(res.state.body?.error || ''), /between 1 and 365/i);
});

test('extendNoticeExpiry updates notification expiry when input is valid', async () => {
  const updates = [];
  const attempts = [
    {
      id: 'attempt-1',
      notification_id: 'notif-1',
      payload: {
        source: 'master_admin_notice',
        notice_id: 'notice_abc',
        expires_at: '2099-01-01T00:00:00.000Z',
      },
    },
    {
      id: 'attempt-2',
      notification_id: 'notif-2',
      payload: {
        source: 'master_admin_notice',
        notice_id: 'notice_abc',
        expires_at: '2099-01-02T00:00:00.000Z',
      },
    },
  ];

  const adminClient = {
    from(table) {
      if (table === 'notification_delivery_attempts') {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          order() {
            return this;
          },
          async limit() {
            return { data: attempts, error: null };
          },
          update(payload) {
            return {
              async eq(column, value) {
                updates.push({ table, payload, where: { column, value } });
                return { error: null };
              },
            };
          },
        };
      }

      if (table === 'notifications') {
        return {
          update(payload) {
            return {
              async in(column, ids) {
                updates.push({ table, payload, where: { column, ids } });
                return { error: null };
              },
            };
          },
        };
      }

      throw new Error(`Unexpected table access: ${table}`);
    },
  };

  const controller = loadControllerWithMocks();
  controller.__setServiceClientFactoryForTest(() => adminClient);

  const req = {
    params: { noticeId: 'notice_abc' },
    body: { extend_days: 2 },
  };
  const res = createRes();

  await controller.extendNoticeExpiry(req, res);

  assert.equal(res.state.statusCode, 200);
  assert.equal(res.state.body?.notice_id, 'notice_abc');
  assert.equal(res.state.body?.extended_by_days, 2);
  assert.ok(typeof res.state.body?.expires_at === 'string');

  const notificationsUpdate = updates.find((u) => u.table === 'notifications');
  assert.ok(notificationsUpdate, 'Expected notifications update call');
  assert.deepEqual(notificationsUpdate.where.ids.sort(), ['notif-1', 'notif-2']);

  const attemptPayloadUpdates = updates.filter((u) => u.table === 'notification_delivery_attempts');
  assert.equal(attemptPayloadUpdates.length, 2);
  for (const entry of attemptPayloadUpdates) {
    assert.equal(entry.payload?.payload?.notice_id, 'notice_abc');
    assert.ok(typeof entry.payload?.payload?.expires_at === 'string');
  }

  controller.__setServiceClientFactoryForTest(null);
});
