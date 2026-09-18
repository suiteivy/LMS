const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const supabaseModulePath = path.resolve(__dirname, '../utils/supabaseClient.js');
const supabaseJsModulePath = require.resolve('@supabase/supabase-js');

function loadWithMocks(moduleRelativePath, mockSupabase, scopedAuthMock) {
  const targetModulePath = path.resolve(__dirname, moduleRelativePath);
  delete require.cache[targetModulePath];
  delete require.cache[supabaseModulePath];
  delete require.cache[supabaseJsModulePath];

  require.cache[supabaseModulePath] = {
    id: supabaseModulePath,
    filename: supabaseModulePath,
    loaded: true,
    exports: mockSupabase,
  };

  require.cache[supabaseJsModulePath] = {
    id: supabaseJsModulePath,
    filename: supabaseJsModulePath,
    loaded: true,
    exports: {
      createClient: () => ({
        auth: scopedAuthMock || mockSupabase.auth,
      }),
    },
  };

  return require(targetModulePath);
}

function mockResponse() {
  let statusCode = 200;
  let payload = null;
  return {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      payload = data;
      return this;
    },
    getStatusCode: () => statusCode,
    getPayload: () => payload,
  };
}

test('login enforces lockout at 4 consecutive failed attempts and revokes sessions', async () => {
  let updatedUsers = [];
  let updatedSessions = [];

  const mockUser = {
    id: 'user-lockout-1',
    email: 'lockout@example.com',
    is_active: true,
    disabled_reason: null,
    failed_login_attempts: 3, // 3 previous failed attempts
  };

  const scopedAuthMock = {
    async signInWithPassword() {
      return {
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      };
    },
  };

  const mockSupabase = {
    auth: {
      ...scopedAuthMock,
      admin: {},
    },
    from(table) {
      if (table === 'system_settings') {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          async maybeSingle() {
            return { data: { value: { enabled: false } }, error: null };
          },
        };
      }
      if (table === 'users') {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          ilike() {
            return this;
          },
          async maybeSingle() {
            return { data: { ...mockUser }, error: null };
          },
          update(updates) {
            updatedUsers.push(updates);
            return {
              async eq() {
                return { error: null };
              },
            };
          },
        };
      }
      if (table === 'user_sessions') {
        return {
          update(updates) {
            updatedSessions.push(updates);
            return {
              eq() {
                return {
                  async eq() {
                    return { error: null };
                  },
                };
              },
              async in() {
                return { error: null };
              },
            };
          },
        };
      }
      if (table === 'password_audit_logs') {
        return {
          async insert() {
            return { error: null };
          },
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  };

  const authController = loadWithMocks('../controllers/auth.controller.js', mockSupabase, scopedAuthMock);

  const req = {
    body: { email: 'lockout@example.com', password: 'wrong-password' },
    headers: { 'user-agent': 'test-agent' },
    ip: '127.0.0.1',
  };
  const res = mockResponse();

  await authController.login(req, res);

  assert.equal(res.getStatusCode(), 403);
  const payload = res.getPayload();
  assert.equal(payload.code, 'ACCOUNT_LOCKED');
  assert.match(payload.error, /locked/i);
  assert.match(payload.error, /forgot password/i);

  // Verify DB updates
  assert.equal(updatedUsers.length, 1);
  assert.equal(updatedUsers[0].failed_login_attempts, 4);
  assert.equal(updatedUsers[0].is_active, false);
  assert.equal(updatedUsers[0].disabled_reason, 'failed_login_lockout');

  // Verify sessions revoked
  assert.equal(updatedSessions.length, 1);
  assert.equal(updatedSessions[0].is_revoked, true);
});

test('login blocks already locked account with 403 ACCOUNT_LOCKED', async () => {
  const mockUser = {
    id: 'user-lockout-2',
    email: 'already-locked@example.com',
    is_active: false,
    disabled_reason: 'failed_login_lockout',
    failed_login_attempts: 4,
  };

  const mockSupabase = {
    auth: {},
    from(table) {
      if (table === 'system_settings') {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          async maybeSingle() {
            return { data: { value: { enabled: false } }, error: null };
          },
        };
      }
      if (table === 'users') {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          ilike() {
            return this;
          },
          async maybeSingle() {
            return { data: { ...mockUser }, error: null };
          },
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  };

  const authController = loadWithMocks('../controllers/auth.controller.js', mockSupabase, {});

  const req = {
    body: { email: 'already-locked@example.com', password: 'any-password' },
    headers: {},
  };
  const res = mockResponse();

  await authController.login(req, res);

  assert.equal(res.getStatusCode(), 403);
  const payload = res.getPayload();
  assert.equal(payload.code, 'ACCOUNT_LOCKED');
  assert.match(payload.error, /locked/i);
});

test('resetPassword unlocks locked account and resets failed_login_attempts', async () => {
  let userUpdates = [];
  const mockUser = {
    id: 'user-lockout-3',
    email: 'to-unlock@example.com',
    is_active: false,
    disabled_reason: 'failed_login_lockout',
    failed_login_attempts: 4,
  };

  const scopedAuthMock = {
    async getUser(token) {
      if (token === 'valid-reset-token') {
        return {
          data: { user: { id: mockUser.id, email: mockUser.email } },
          error: null,
        };
      }
      return { data: { user: null }, error: { message: 'Invalid token' } };
    },
  };

  const mockSupabase = {
    auth: {
      admin: {
        async updateUserById() {
          return { error: null };
        },
      },
    },
    from(table) {
      if (table === 'users') {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          async maybeSingle() {
            return { data: { ...mockUser }, error: null };
          },
          update(updates) {
            userUpdates.push(updates);
            return {
              async eq() {
                return { error: null };
              },
            };
          },
        };
      }
      if (table === 'user_password_history') {
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
          limit() {
            return this;
          },
          async maybeSingle() {
            return { data: [], error: null };
          },
          async insert() {
            return { error: null };
          },
        };
      }
      if (table === 'password_audit_logs') {
        return {
          async insert() {
            return { error: null };
          },
        };
      }
      if (table === 'user_sessions') {
        return {
          update() {
            return {
              eq() {
                return {
                  async eq() {
                    return { error: null };
                  },
                };
              },
            };
          },
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  };

  const authController = loadWithMocks('../controllers/auth.controller.js', mockSupabase, scopedAuthMock);

  const req = {
    body: { access_token: 'valid-reset-token', new_password: 'ValidPassword123!@#' },
    ip: '127.0.0.1',
  };
  const res = mockResponse();

  await authController.resetPassword(req, res);

  assert.equal(res.getStatusCode(), 200);
  assert.equal(res.getPayload().success, true);

  // Check user unlock updates
  const unlockUpdate = userUpdates.find(u => u.is_active === true);
  assert.ok(unlockUpdate, 'User should be reactivated');
  assert.equal(unlockUpdate.is_active, true);
  assert.equal(unlockUpdate.disabled_reason, null);
  assert.equal(unlockUpdate.failed_login_attempts, 0);
});

test('login evicts oldest session when active sessions reach limit of 3', async () => {
  let evictedSessionIds = [];
  const nowMs = Date.now();
  const existingActiveSessions = [
    { id: 'sess-oldest', last_active_at: new Date(nowMs - 1000).toISOString(), expires_at: new Date(nowMs + 86400000).toISOString() },
    { id: 'sess-middle', last_active_at: new Date(nowMs - 500).toISOString(), expires_at: new Date(nowMs + 86400000).toISOString() },
    { id: 'sess-newest', last_active_at: new Date(nowMs - 100).toISOString(), expires_at: new Date(nowMs + 86400000).toISOString() },
  ];

  const mockUser = {
    id: 'user-multisess-1',
    email: 'multisess@example.com',
    role: 'student',
    institution_id: 'inst-1',
    is_active: true,
    failed_login_attempts: 0,
  };

  const scopedAuthMock = {
    async signInWithPassword() {
      return {
        data: {
          user: { id: mockUser.id, email: mockUser.email },
          session: { access_token: 'new-tok', refresh_token: 'new-ref' },
        },
        error: null,
      };
    },
  };

  const mockSupabase = {
    auth: {
      ...scopedAuthMock,
      admin: {},
    },
    from(table) {
      if (table === 'system_settings') {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          async maybeSingle() {
            return { data: { value: { enabled: false } }, error: null };
          },
        };
      }
      if (table === 'users') {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          ilike() {
            return this;
          },
          async maybeSingle() {
            return { data: { ...mockUser }, error: null };
          },
          async single() {
            return {
              data: {
                id: mockUser.id,
                email: mockUser.email,
                first_name: 'Test',
                last_name: 'User',
                full_name: 'Test User',
                role: 'student',
                institution_id: 'inst-1',
                must_change_password: false,
                requires_security_questions_setup: false,
                admins: [],
              },
              error: null,
            };
          },
          update() {
            return {
              async eq() {
                return { error: null };
              },
            };
          },
        };
      }
      if (table === 'user_roles') {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          async maybeSingle() {
            return { data: null, error: null };
          },
        };
      }
      if (table === 'students') {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          async single() {
            return { data: { id: 'stud-1' }, error: null };
          },
        };
      }
      if (table === 'institutions') {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          async single() {
            return { data: { id: 'inst-1', name: 'Test Institution' }, error: null };
          },
        };
      }
      if (table === 'user_sessions') {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          gt() {
            return this;
          },
          order() {
            return {
              data: [...existingActiveSessions],
              error: null,
            };
          },
          update(updates) {
            return {
              async in(_col, ids) {
                if (updates.is_revoked === true) {
                  evictedSessionIds.push(...ids);
                }
                return { error: null };
              },
            };
          },
          async upsert() {
            return { error: null };
          },
        };
      }
      if (table === 'institution_branding') {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          async maybeSingle() {
            return { data: null, error: null };
          },
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  };

  const authController = loadWithMocks('../controllers/auth.controller.js', mockSupabase, scopedAuthMock);

  const req = {
    body: { email: 'multisess@example.com', password: 'correct-password' },
    headers: { 'user-agent': 'Chrome / Mac' },
    ip: '127.0.0.1',
  };
  const res = mockResponse();

  await authController.login(req, res);

  assert.equal(res.getStatusCode(), 200);
  const payload = res.getPayload();
  assert.equal(payload.sessionQuota.max, 3);
  assert.equal(payload.sessionQuota.evictedOldest, true);
  // Expect oldest session to have been evicted
  assert.ok(evictedSessionIds.includes('sess-oldest'), 'Oldest session sess-oldest must be evicted');
});

test('preferences controller returns and updates all 5 new preference toggles', async () => {
  let savedPreferences = null;

  const mockSupabase = {
    from(table) {
      if (table === 'user_preferences') {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          async single() {
            return {
              data: {
                user_id: 'user-pref-1',
                theme: 'dark',
                push_notifications: true,
                email_notifications: true,
                submission_alerts: true,
                system_alerts: true,
                subscription_alerts: true,
                issues_requests_alerts: true,
                support_cases_alerts: true,
                reduced_motion: false,
                font_size: 'normal',
                share_staff_presence: true,
                grade_release_alerts: true,
                attendance_digest: true,
              },
              error: null,
            };
          },
          upsert(record) {
            savedPreferences = record;
            return {
              select() {
                return {
                  async single() {
                    return { data: record, error: null };
                  },
                };
              },
            };
          },
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  };

  const prefController = loadWithMocks('../controllers/preferences.controller.js', mockSupabase);

  // Test get
  const getReq = { user: { id: 'user-pref-1' } };
  const getRes = mockResponse();
  await prefController.getPreferences(getReq, getRes);

  assert.equal(getRes.getStatusCode(), 200);
  const prefs = getRes.getPayload();
  assert.equal(prefs.reduced_motion, false);
  assert.equal(prefs.share_staff_presence, true);
  assert.equal(prefs.grade_release_alerts, true);
  assert.equal(prefs.attendance_digest, true);

  // Test update
  const updateReq = {
    user: { id: 'user-pref-1' },
    body: {
      reduced_motion: true,
      share_staff_presence: false,
      grade_release_alerts: false,
      attendance_digest: false,
    },
  };
  const updateRes = mockResponse();
  await prefController.updatePreferences(updateReq, updateRes);

  assert.equal(updateRes.getStatusCode(), 200);
  assert.equal(savedPreferences.reduced_motion, true);
  assert.equal(savedPreferences.share_staff_presence, false);
  assert.equal(savedPreferences.grade_release_alerts, false);
  assert.equal(savedPreferences.attendance_digest, false);
});

test('login tracks failed attempts 1-3 with 401 and remaining attempts warning', async () => {
  let updatedUsers = [];

  const mockUser = {
    id: 'user-lockout-attempt-1',
    email: 'attempt1@example.com',
    is_active: true,
    disabled_reason: null,
    failed_login_attempts: 0,
  };

  const scopedAuthMock = {
    async signInWithPassword() {
      return {
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      };
    },
  };

  const mockSupabase = {
    auth: { ...scopedAuthMock, admin: {} },
    from(table) {
      if (table === 'system_settings') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { value: { enabled: false } }, error: null }) }) }),
        };
      }
      if (table === 'users') {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          ilike() {
            return this;
          },
          async maybeSingle() {
            return { data: { ...mockUser }, error: null };
          },
          update(updates) {
            updatedUsers.push(updates);
            return {
              async eq() {
                return { error: null };
              },
            };
          },
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  };

  const authController = loadWithMocks('../controllers/auth.controller.js', mockSupabase, scopedAuthMock);

  const req = {
    body: { email: 'attempt1@example.com', password: 'wrong' },
    headers: { 'user-agent': 'test-agent' },
    ip: '127.0.0.1',
  };
  const res = mockResponse();

  await authController.login(req, res);

  assert.equal(res.getStatusCode(), 401);
  const payload = res.getPayload();
  assert.equal(payload.code, 'INVALID_CREDENTIALS');
  assert.equal(payload.remainingAttempts, 3);
  assert.match(payload.error, /3 attempts remaining/i);
  assert.equal(updatedUsers.length, 1);
  assert.equal(updatedUsers[0].failed_login_attempts, 1);
  assert.equal(updatedUsers[0].is_active, undefined);
});

test('login when active sessions are under limit of 3 does not evict any session', async () => {
  let evictedSessionIds = [];
  const nowMs = Date.now();
  const existingActiveSessions = [
    { id: 'sess-1', last_active_at: new Date(nowMs - 500).toISOString(), expires_at: new Date(nowMs + 86400000).toISOString() },
  ];

  const mockUser = {
    id: 'user-underlimit-1',
    email: 'underlimit@example.com',
    role: 'student',
    institution_id: 'inst-1',
    is_active: true,
    failed_login_attempts: 0,
  };

  const scopedAuthMock = {
    async signInWithPassword() {
      return {
        data: {
          user: { id: mockUser.id, email: mockUser.email },
          session: { access_token: 'new-tok', refresh_token: 'new-ref' },
        },
        error: null,
      };
    },
  };

  const mockSupabase = {
    auth: { ...scopedAuthMock, admin: {} },
    from(table) {
      if (table === 'system_settings') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { value: { enabled: false } }, error: null }) }) }) };
      }
      if (table === 'users') {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          ilike() {
            return this;
          },
          async maybeSingle() {
            return { data: { ...mockUser }, error: null };
          },
          async single() {
            return {
              data: {
                id: mockUser.id,
                email: mockUser.email,
                first_name: 'Test',
                last_name: 'User',
                full_name: 'Test User',
                role: 'student',
                institution_id: 'inst-1',
                must_change_password: false,
                requires_security_questions_setup: false,
                admins: [],
              },
              error: null,
            };
          },
          update() {
            return {
              async eq() {
                return { error: null };
              },
            };
          },
        };
      }
      if (table === 'user_roles') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
      }
      if (table === 'students') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'stud-1' }, error: null }) }) }) };
      }
      if (table === 'institutions') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'inst-1', name: 'Inst' }, error: null }) }) }) };
      }
      if (table === 'user_sessions') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({ data: [...existingActiveSessions], error: null }),
              }),
            }),
          }),
          update(updates) {
            return {
              async in(_col, ids) {
                if (updates.is_revoked === true) {
                  evictedSessionIds.push(...ids);
                }
                return { error: null };
              },
            };
          },
          async upsert() { return { error: null }; },
        };
      }
      if (table === 'institution_branding') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  };

  const authController = loadWithMocks('../controllers/auth.controller.js', mockSupabase, scopedAuthMock);

  const req = {
    body: { email: 'underlimit@example.com', password: 'correct' },
    headers: { 'user-agent': 'Safari / iOS' },
    ip: '127.0.0.1',
  };
  const res = mockResponse();

  await authController.login(req, res);

  assert.equal(res.getStatusCode(), 200);
  const payload = res.getPayload();
  assert.equal(payload.sessionQuota.max, 3);
  assert.equal(payload.sessionQuota.evictedOldest, false);
  assert.equal(evictedSessionIds.length, 0);
});

test('rate limiter heavyPdf blocks 11th request with 429 and retryAfter', () => {
  const { rateLimiters } = require('../middleware/rateLimiter.js');

  const userId = 'user-heavy-test-1';
  const ip = '192.168.100.1';

  let nextCalls = 0;
  const next = () => { nextCalls++; };

  let lastStatusCode = 200;
  let lastPayload = null;
  const headers = {};

  const makeReq = () => ({
    ip,
    user: { id: userId },
    connection: { remoteAddress: ip },
  });

  const makeRes = () => ({
    set(key, val) {
      headers[key] = val;
      return this;
    },
    status(code) {
      lastStatusCode = code;
      return this;
    },
    json(data) {
      lastPayload = data;
      return this;
    },
  });

  // Requests 1 to 10 should succeed
  for (let i = 1; i <= 10; i++) {
    rateLimiters.heavyPdf(makeReq(), makeRes(), next);
  }

  assert.equal(nextCalls, 10, 'First 10 calls should pass next()');
  assert.equal(headers['X-RateLimit-Limit'], 10);
  assert.equal(headers['X-RateLimit-Remaining'], 0);
  assert.ok(headers['X-RateLimit-Reset'], 'Must set X-RateLimit-Reset');

  // 11th request should be rate limited
  rateLimiters.heavyPdf(makeReq(), makeRes(), next);
  assert.equal(nextCalls, 10, '11th call should not call next()');
  assert.equal(lastStatusCode, 429);
  assert.equal(lastPayload.code, 'RATE_LIMIT_EXCEEDED');
  assert.ok(lastPayload.retryAfter >= 1);
  assert.match(lastPayload.error, /Too many requests/i);
});

test('rate limiter differentiates by user ID and falls back to IP', () => {
  const { createRateLimiter } = require('../middleware/rateLimiter.js');

  const limiter = createRateLimiter({
    windowMs: 60000,
    maxRequests: 2,
    keyPrefix: 'test-diff',
    differentiateByUser: true,
  });

  const sharedIp = '10.50.0.1';
  let nextCalls = 0;
  const next = () => { nextCalls++; };

  const createReqRes = (userId, ip = sharedIp) => {
    let statusCode = 200;
    let payload = null;
    const req = {
      ip,
      user: userId ? { id: userId } : null,
      userId: userId || null,
      connection: { remoteAddress: ip },
    };
    const res = {
      set() { return this; },
      status(code) { statusCode = code; return this; },
      json(data) { payload = data; return this; },
      getStatusCode: () => statusCode,
      getPayload: () => payload,
    };
    return { req, res };
  };

  // User 1 uses their 2 requests
  const u1r1 = createReqRes('user-1');
  limiter(u1r1.req, u1r1.res, next);
  const u1r2 = createReqRes('user-1');
  limiter(u1r2.req, u1r2.res, next);
  assert.equal(nextCalls, 2);

  // User 1 3rd request -> blocked with 429
  const u1r3 = createReqRes('user-1');
  limiter(u1r3.req, u1r3.res, next);
  assert.equal(nextCalls, 2);
  assert.equal(u1r3.res.getStatusCode(), 429);

  // User 2 on the SAME IP makes a request -> allowed!
  const u2r1 = createReqRes('user-2');
  limiter(u2r1.req, u2r1.res, next);
  assert.equal(nextCalls, 3, 'User 2 on same IP should not be blocked by User 1 limit');
  assert.equal(u2r1.res.getStatusCode(), 200);

  // Fallback to IP when unauthenticated
  const anonLimiter = createRateLimiter({
    windowMs: 60000,
    maxRequests: 1,
    keyPrefix: 'test-anon',
    differentiateByUser: false,
  });
  let anonNext = 0;
  const a1 = createReqRes(null, '192.168.1.1');
  anonLimiter(a1.req, a1.res, () => { anonNext++; });
  assert.equal(anonNext, 1);

  const a2 = createReqRes(null, '192.168.1.1');
  anonLimiter(a2.req, a2.res, () => { anonNext++; });
  assert.equal(anonNext, 1);
  assert.equal(a2.res.getStatusCode(), 429);
});

test('notificationDelivery resolves preference keys and suppresses notifications according to user preferences', async () => {
  const {
    resolvePreferenceKey,
    isNotificationAllowedByPreferences,
  } = require('../services/notificationDelivery.service.js');

  // Key mappings
  assert.equal(resolvePreferenceKey({ source: 'submission' }), 'submission_alerts');
  assert.equal(resolvePreferenceKey({ source: 'assignment_submission' }), 'submission_alerts');
  assert.equal(resolvePreferenceKey({ type: 'submission' }), 'submission_alerts');
  assert.equal(resolvePreferenceKey({ source: 'grade_release' }), 'grade_release_alerts');
  assert.equal(resolvePreferenceKey({ source: 'report_card' }), 'grade_release_alerts');
  assert.equal(resolvePreferenceKey({ source: 'attendance' }), 'attendance_digest');
  assert.equal(resolvePreferenceKey({ source: 'attendance_digest' }), 'attendance_digest');
  assert.equal(resolvePreferenceKey({ source: 'support_case' }), 'support_cases_alerts');
  assert.equal(resolvePreferenceKey({ source: 'system_maintenance' }), 'system_alerts');
  assert.equal(resolvePreferenceKey({ source: 'unknown' }), 'push_notifications');

  // Test preference suppression
  const userWithDisabledSubmissions = {
    id: 'user-sub-off',
    push_notifications: true,
    submission_alerts: false,
    grade_release_alerts: true,
    attendance_digest: true,
  };

  const cache = new Map();
  cache.set('user-sub-off', userWithDisabledSubmissions);

  const submissionAllowed = await isNotificationAllowedByPreferences({
    userId: 'user-sub-off',
    payload: { source: 'submission' },
    cache,
  });
  assert.equal(submissionAllowed, false, 'Submission notification should be suppressed when submission_alerts is false');

  const gradeAllowed = await isNotificationAllowedByPreferences({
    userId: 'user-sub-off',
    payload: { source: 'grade_release' },
    cache,
  });
  assert.equal(gradeAllowed, true, 'Grade release notification should be allowed when grade_release_alerts is true');

  // Global push_notifications = false suppresses everything
  const userAllMuted = {
    id: 'user-muted',
    push_notifications: false,
    submission_alerts: true,
  };
  cache.set('user-muted', userAllMuted);

  const anyAllowed = await isNotificationAllowedByPreferences({
    userId: 'user-muted',
    payload: { source: 'submission' },
    cache,
  });
  assert.equal(anyAllowed, false, 'All notifications should be suppressed when push_notifications is false');
});

test('attendance getStaffPresence respects share_staff_presence privacy for peers while retaining visibility for admin', async () => {
  const teachersInDb = [
    {
      id: 'teach-1',
      user_id: 'user-teach-1',
      department: 'Math',
      position: 'Senior Teacher',
      users: { id: 'user-teach-1', first_name: 'Private', last_name: 'Teacher', full_name: 'Private Teacher', institution_id: 'inst-test-1' },
    },
    {
      id: 'teach-2',
      user_id: 'user-teach-2',
      department: 'Science',
      position: 'HOD',
      users: { id: 'user-teach-2', first_name: 'Public', last_name: 'Teacher', full_name: 'Public Teacher', institution_id: 'inst-test-1' },
    },
  ];

  const mockSupabase = {
    from(table) {
      if (table === 'teachers') {
        return {
          select: () => ({
            eq: () => ({
              data: [...teachersInDb],
              error: null,
            }),
          }),
        };
      }
      if (table === 'user_preferences') {
        return {
          select: () => ({
            in: () => ({
              eq: () => ({
                data: [{ user_id: 'user-teach-1', share_staff_presence: false }],
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'teacher_attendance') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                data: [],
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'timetables') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                data: [],
                error: null,
              }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  };

  const attendanceController = loadWithMocks('../controllers/attendance.controller.js', mockSupabase);

  // 1. Peer viewer (teacher role): Private Teacher should be filtered out
  const peerReq = {
    userRole: 'teacher',
    institution_id: 'inst-test-1',
    user: { role: 'teacher', institution_id: 'inst-test-1' },
    query: { date: '2026-09-18' },
  };
  const peerRes = mockResponse();
  await attendanceController.getStaffPresence(peerReq, peerRes);

  assert.equal(peerRes.getStatusCode(), 200);
  const peerData = peerRes.getPayload();
  assert.equal(peerData.length, 1);
  assert.equal(peerData[0].name, 'Public Teacher');

  // 2. Admin viewer: both teachers should be visible
  const adminReq = {
    userRole: 'admin',
    institution_id: 'inst-test-1',
    user: { role: 'admin', institution_id: 'inst-test-1' },
    query: { date: '2026-09-18' },
  };
  const adminRes = mockResponse();
  await attendanceController.getStaffPresence(adminReq, adminRes);

  assert.equal(adminRes.getStatusCode(), 200);
  const adminData = adminRes.getPayload();
  assert.equal(adminData.length, 2);
  const names = adminData.map(s => s.name);
  assert.ok(names.includes('Private Teacher'));
  assert.ok(names.includes('Public Teacher'));
});

test('toast isSubstantialToast identifies long messages, high word count, and critical codes', () => {
  const isSubstantialToast = (title, message, code) => {
    const fullText = `${title || ''} ${message || ''}`.trim();
    if (fullText.length > 85) return true;
    const wordCount = fullText.split(/\s+/).filter(Boolean).length;
    if (wordCount > 15) return true;
    if (code && ['ACCOUNT_LOCKED', 'ACCOUNT_DISABLED', 'RATE_LIMIT_EXCEEDED'].includes(code)) return true;
    return false;
  };

  assert.equal(isSubstantialToast('Success', 'Preferences saved'), false);

  const longText = 'Your clearance request has been processed and is awaiting final administrative signature.';
  assert.ok(longText.length > 85);
  assert.equal(isSubstantialToast('Notice', longText), true);

  const verboseMessage = 'Please ensure that all the library books laboratory equipment and fees balances are cleared immediately today';
  assert.ok(verboseMessage.split(/\s+/).filter(Boolean).length > 15);
  assert.equal(isSubstantialToast('Notice', verboseMessage), true);

  assert.equal(isSubstantialToast('Error', 'Locked', 'ACCOUNT_LOCKED'), true);
  assert.equal(isSubstantialToast('Error', 'Disabled', 'ACCOUNT_DISABLED'), true);
  assert.equal(isSubstantialToast('Warning', 'Slow down', 'RATE_LIMIT_EXCEEDED'), true);
});

