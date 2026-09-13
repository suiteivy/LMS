const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const authMiddlewarePath = path.resolve(__dirname, '../middleware/auth.middleware.js');
const authControllerPath = path.resolve(__dirname, '../controllers/auth.controller.js');
const financeControllerPath = path.resolve(__dirname, '../controllers/finance.controller.js');
const supabaseClientPath = path.resolve(__dirname, '../utils/supabaseClient.js');

function createRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function createSupabaseMock(resolver) {
  return {
    from(table) {
      const state = {
        table,
        filters: [],
        orders: [],
      };

      const builder = {
        select(columns, options) {
          state.select = { columns, options };
          return this;
        },
        order(column, options) {
          state.orders.push({ column, options });
          return this;
        },
        eq(column, value) {
          state.filters.push({ op: 'eq', column, value });
          return this;
        },
        in(column, values) {
          state.filters.push({ op: 'in', column, values });
          return this;
        },
        insert(data) {
          state.insert = data;
          return Promise.resolve(resolver(state));
        },
        update(data) {
          state.update = data;
          return {
            eq(col, val) {
              state.filters.push({ op: 'eq', column: col, value: val });
              return Promise.resolve(resolver(state));
            },
          };
        },
        delete() {
          return {
            eq(col, val) {
              state.filters.push({ op: 'eq', column: col, value: val });
              return Promise.resolve(resolver(state));
            },
          };
        },
        maybeSingle() {
          state.terminal = 'maybeSingle';
          return Promise.resolve(resolver(state));
        },
        single() {
          state.terminal = 'single';
          return Promise.resolve(resolver(state));
        },
        then(onFulfilled, onRejected) {
          state.terminal = state.terminal || 'query';
          return Promise.resolve(resolver(state)).then(onFulfilled, onRejected);
        },
      };

      return builder;
    },
    auth: {
      getUser(token) {
        return Promise.resolve({
          data: { user: { id: 'user-123', email: 'test@school.edu' } },
          error: null,
        });
      },
    },
  };
}

test('auth.middleware blocks accounts past data retention period with 403 ACCOUNT_RETENTION_EXPIRED', async () => {
  const req = {
    headers: { authorization: 'Bearer valid-token' },
    originalUrl: '/api/teacher/history',
    method: 'GET',
  };
  const res = createRes();

  const originalSupabase = require(supabaseClientPath);

  // Retention expired in the past
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const mockSupabase = createSupabaseMock((state) => {
    if (state.table === 'users') {
      return {
        data: {
          id: 'user-123',
          role: 'teacher',
          institution_id: 'inst-1',
          is_active: false,
          retention_until: pastDate,
        },
        error: null,
      };
    }
    return { data: null, error: null };
  });

  require.cache[supabaseClientPath] = { exports: mockSupabase };
  delete require.cache[authMiddlewarePath];
  const { authenticate } = require(authMiddlewarePath);

  let nextCalled = false;
  await authenticate(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body?.code, 'ACCOUNT_RETENTION_EXPIRED');

  require.cache[supabaseClientPath] = { exports: originalSupabase };
  delete require.cache[authMiddlewarePath];
});

test('auth.middleware allows leaver read-only historical access on GET, but blocks mutations with 403 LEAVER_READ_ONLY', async () => {
  const originalSupabase = require(supabaseClientPath);

  // Retention in future (still within retention window)
  const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  const mockSupabase = createSupabaseMock((state) => {
    if (state.table === 'users') {
      return {
        data: {
          id: 'user-123',
          role: 'teacher',
          institution_id: 'inst-1',
          is_active: false,
          retention_until: futureDate,
        },
        error: null,
      };
    }
    if (state.table === 'teachers') {
      return {
        data: { id: 't-123', employment_status: 'resigned', lifecycle_status: 'resigned' },
        error: null,
      };
    }
    return { data: null, error: null };
  });

  require.cache[supabaseClientPath] = { exports: mockSupabase };
  delete require.cache[authMiddlewarePath];
  const { authenticate } = require(authMiddlewarePath);

  // 1. GET request -> allowed
  const getReq = {
    headers: { authorization: 'Bearer valid-token' },
    originalUrl: '/api/teacher/history',
    method: 'GET',
  };
  const getRes = createRes();
  let getNextCalled = false;
  await authenticate(getReq, getRes, () => {
    getNextCalled = true;
  });

  assert.equal(getNextCalled, true, 'Leaver is allowed to access historical records during data retention period');
  assert.equal(getReq.user.is_leaver, true);

  // 2. POST request on operational route -> blocked
  const postReq = {
    headers: { authorization: 'Bearer valid-token' },
    originalUrl: '/api/attendance/mark',
    method: 'POST',
  };
  const postRes = createRes();
  let postNextCalled = false;
  await authenticate(postReq, postRes, () => {
    postNextCalled = true;
  });

  assert.equal(postNextCalled, false);
  assert.equal(postRes.statusCode, 403);
  assert.equal(postRes.body?.code, 'LEAVER_READ_ONLY');

  require.cache[supabaseClientPath] = { exports: originalSupabase };
  delete require.cache[authMiddlewarePath];
});

test('authController.markUserAsLeaver updates lifecycle and retention_until with audit logging', async () => {
  let loggedAudit = null;
  let updatedUser = null;

  const originalSupabase = require(supabaseClientPath);

  const mockSupabase = createSupabaseMock((state) => {
    if (state.table === 'users') {
      if (state.update) {
        updatedUser = state.update;
        return { data: { id: 'target-user-1', ...state.update }, error: null };
      }
      return {
        data: { id: 'target-user-1', role: 'student', institution_id: 'inst-1' },
        error: null,
      };
    }
    if (state.table === 'students') {
      return {
        data: { id: 'student-row-1' },
        error: null,
      };
    }
    if (state.table === 'record_change_log') {
      loggedAudit = Array.isArray(state.insert) ? state.insert[0] : state.insert;
      return { data: { id: 'audit-log-1' }, error: null };
    }
    return { data: {}, error: null };
  });

  require.cache[supabaseClientPath] = { exports: mockSupabase };
  delete require.cache[authControllerPath];
  const authController = require(authControllerPath);

  const req = {
    params: { userId: 'target-user-1' },
    body: {
      exit_reason: 'Transferred to another school',
      lifecycle_status: 'transferred',
      retention_years: 5,
    },
    user: { id: 'admin-actor-1', role: 'admin', institution_id: 'inst-1' },
  };
  const res = createRes();

  await authController.markUserAsLeaver(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.success, true);
  assert.equal(updatedUser?.is_active, false);
  assert.ok(updatedUser?.retention_until, 'retention_until was properly computed');
  assert.ok(loggedAudit, 'record change was logged to record_change_log audit table');
  assert.equal(loggedAudit?.change_type, 'MARK_LEAVER');
  assert.equal(loggedAudit?.changed_by, 'admin-actor-1');

  require.cache[supabaseClientPath] = { exports: originalSupabase };
  delete require.cache[authControllerPath];
});

test('financeController.toggleFinanceAdminDesignation grants and logs designation', async () => {
  let loggedFinanceAudit = null;
  let insertedDesignation = null;

  const originalSupabase = require(supabaseClientPath);

  const mockSupabase = createSupabaseMock((state) => {
    if (state.table === 'users') {
      return {
        data: { id: 'teacher-1', role: 'teacher', full_name: 'Teacher One', institution_id: 'inst-1' },
        error: null,
      };
    }
    if (state.table === 'finance_admin_designations') {
      if (state.insert) {
        insertedDesignation = state.insert;
        return { data: { id: 'des-1' }, error: null };
      }
      return { data: null, error: null }; // not currently designated
    }
    if (state.table === 'finance_admin_audit_logs') {
      loggedFinanceAudit = state.insert;
      return { data: { id: 'log-1' }, error: null };
    }
    return { data: {}, error: null };
  });

  require.cache[supabaseClientPath] = { exports: mockSupabase };
  delete require.cache[financeControllerPath];
  const financeController = require(financeControllerPath);

  const req = {
    body: {
      userId: 'teacher-1',
      designate: true,
      reason: 'Assigned as interim bursar for Term 2',
    },
    user: { id: 'main-admin-1', role: 'admin', is_main: true, institution_id: 'inst-1' },
  };
  const res = createRes();

  await financeController.toggleFinanceAdminDesignation(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.success, true);
  assert.ok(insertedDesignation, 'Designation was inserted');
  assert.equal(insertedDesignation?.user_id, 'teacher-1');
  assert.ok(loggedFinanceAudit, 'Audit log was written to finance_admin_audit_logs');
  assert.equal(loggedFinanceAudit?.action, 'assigned');
  assert.equal(loggedFinanceAudit?.reason, 'Assigned as interim bursar for Term 2');

  require.cache[supabaseClientPath] = { exports: originalSupabase };
  delete require.cache[financeControllerPath];
});
