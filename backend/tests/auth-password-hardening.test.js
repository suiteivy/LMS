const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');

const supabaseModulePath = path.resolve(__dirname, '../utils/supabaseClient.js');

function loadWithSupabaseMock(moduleRelativePath, mockSupabase) {
  const targetModulePath = path.resolve(__dirname, moduleRelativePath);
  delete require.cache[targetModulePath];
  delete require.cache[supabaseModulePath];
  require.cache[supabaseModulePath] = {
    id: supabaseModulePath,
    filename: supabaseModulePath,
    loaded: true,
    exports: mockSupabase,
  };
  return require(targetModulePath);
}

function normalizeSecurityAnswer(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function hashSecurityAnswer(answer, salt) {
  return crypto
    .createHash('sha256')
    .update(`${salt}:${normalizeSecurityAnswer(answer)}`)
    .digest('hex');
}

function createTestJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.sig`;
}

test('auth middleware returns 428 when password change is required', async () => {
  const mockSupabase = {
    auth: {
      async getUser() {
        return {
          data: { user: { id: 'user-1', email: 'student@example.com' } },
          error: null,
        };
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
            return {
              data: {
                id: 'user-1',
                email: 'student@example.com',
                role: 'student',
                institution_id: 'inst-1',
                must_change_password: true,
                requires_security_questions_setup: false,
                admins: [],
                platform_admins: [],
              },
              error: null,
            };
          },
        };
      }

      if (table === 'user_roles') {
        return {
          select() {
            return this;
          },
          async eq() {
            return { data: [], error: null };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };

  const { authMiddleware } = loadWithSupabaseMock('../middleware/auth.middleware.js', mockSupabase);

  const req = {
    headers: { authorization: 'Bearer opaque-token', 'user-agent': 'test-agent' },
    method: 'GET',
    originalUrl: '/api/auth/search-users?q=a',
    path: '/api/auth/search-users',
    socket: { remoteAddress: '127.0.0.1' },
    url: '/api/auth/search-users?q=a',
  };

  let statusCode = 200;
  let payload = null;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      payload = body;
      return this;
    },
  };

  let nextCalled = false;
  await authMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(statusCode, 428);
  assert.equal(payload.code, 'MUST_CHANGE_PASSWORD');
  assert.ok(Array.isArray(payload.allow));
});

test('auth middleware allows credential-delivery token consumption during first-login gate', async () => {
  const mockSupabase = {
    auth: {
      async getUser() {
        return {
          data: { user: { id: 'user-1', email: 'student@example.com' } },
          error: null,
        };
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
            return {
              data: {
                id: 'user-1',
                email: 'student@example.com',
                role: 'student',
                institution_id: 'inst-1',
                must_change_password: true,
                requires_security_questions_setup: true,
                admins: [],
                platform_admins: [],
              },
              error: null,
            };
          },
        };
      }

      if (table === 'user_roles') {
        return {
          select() {
            return this;
          },
          async eq() {
            return { data: [], error: null };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };

  const { authMiddleware } = loadWithSupabaseMock('../middleware/auth.middleware.js', mockSupabase);

  const req = {
    headers: { authorization: 'Bearer opaque-token', 'user-agent': 'test-agent' },
    method: 'POST',
    originalUrl: '/api/auth/credential-delivery/tok-123/consume',
    path: '/api/auth/credential-delivery/tok-123/consume',
    socket: { remoteAddress: '127.0.0.1' },
    url: '/api/auth/credential-delivery/tok-123/consume',
  };

  let statusCode = 200;
  let payload = null;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      payload = body;
      return this;
    },
  };

  let nextCalled = false;
  await authMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(statusCode, 200);
  assert.equal(payload, null);
});

test('auth middleware tolerates duplicate session registration and continues request', async () => {
  const calls = { upsert: 0 };
  const duplicateInsertError = {
    code: '23505',
    message: 'duplicate key value violates unique constraint "user_sessions_session_id_key"',
  };

  const mockSupabase = {
    auth: {
      async getUser() {
        return {
          data: { user: { id: 'user-1', email: 'student@example.com' } },
          error: null,
        };
      },
    },
    from(table) {
      if (table === 'user_sessions') {
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
            return { data: null, error: null };
          },
          async upsert(_payload, options) {
            calls.upsert += 1;
            assert.equal(options?.onConflict, 'session_id');
            assert.equal(options?.ignoreDuplicates, true);
            return { error: duplicateInsertError };
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
          async maybeSingle() {
            return {
              data: {
                id: 'user-1',
                email: 'student@example.com',
                role: 'student',
                institution_id: 'inst-1',
                must_change_password: false,
                requires_security_questions_setup: false,
                admins: [],
                platform_admins: [],
              },
              error: null,
            };
          },
        };
      }

      if (table === 'user_roles') {
        return {
          select() {
            return this;
          },
          async eq() {
            return { data: [], error: null };
          },
        };
      }

      if (table === 'librarian_designations') {
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

  const { authMiddleware } = loadWithSupabaseMock('../middleware/auth.middleware.js', mockSupabase);

  const token = createTestJwt({ session_id: 'sess-123', iat: Math.floor(Date.now() / 1000) });
  const req = {
    headers: { authorization: `Bearer ${token}`, 'user-agent': 'node-test' },
    method: 'GET',
    originalUrl: '/api/auth/search-users?q=a',
    path: '/api/auth/search-users',
    socket: { remoteAddress: '127.0.0.1' },
    url: '/api/auth/search-users?q=a',
  };

  let statusCode = 200;
  let payload = null;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      payload = body;
      return this;
    },
  };

  let nextCalled = false;
  await authMiddleware(req, res, () => {
    nextCalled = true;
  });

  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(nextCalled, true);
  assert.equal(statusCode, 200);
  assert.equal(payload, null);
  assert.equal(calls.upsert, 1);
});

test('verifySecurityQuestions updates password and clears first-login flags', async () => {
  const salt1 = 'salt-1';
  const salt2 = 'salt-2';
  const salt3 = 'salt-3';
  const q1 = 'Blue';
  const q2 = 'Nairobi';
  const q3 = 'Rex';

  const calls = { updateUserById: 0, usersUpdate: 0, auditInsert: 0 };

  const mockSupabase = {
    auth: {
      admin: {
        async updateUserById(userId, payload) {
          calls.updateUserById += 1;
          assert.equal(userId, 'user-1');
          assert.equal(payload.password, 'NewPass123');
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
          ilike(column, value) {
            assert.equal(column, 'email');
            assert.equal(value, 'student@example.com');
            return this;
          },
          async maybeSingle() {
            return {
              data: { id: 'user-1', email: 'student@example.com' },
              error: null,
            };
          },
          eq(column, value) {
            if (column === 'id') {
              return {
                async then() {
                  return null;
                },
              };
            }

            return this;
          },
          update(payload) {
            calls.usersUpdate += 1;
            assert.equal(payload.must_change_password, false);
            assert.equal(payload.requires_security_questions_setup, false);
            return {
              async eq(column, value) {
                assert.equal(column, 'id');
                assert.equal(value, 'user-1');
                return { error: null };
              },
            };
          },
        };
      }

      if (table === 'user_security_answers') {
        return {
          select() {
            return this;
          },
          eq(column, value) {
            assert.equal(column, 'user_id');
            assert.equal(value, 'user-1');
            return {
              async maybeSingle() {
                return {
                  data: {
                    question1_salt: salt1,
                    question1_hash: hashSecurityAnswer(q1, salt1),
                    question2_salt: salt2,
                    question2_hash: hashSecurityAnswer(q2, salt2),
                    question3_salt: salt3,
                    question3_hash: hashSecurityAnswer(q3, salt3),
                  },
                  error: null,
                };
              },
            };
          },
        };
      }

      if (table === 'password_audit_logs') {
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
          async then(resolve) {
            return resolve({ count: 0, error: null });
          },
          async insert(payload) {
            calls.auditInsert += 1;
            assert.equal(payload.action, 'reset_password');
            assert.equal(payload.outcome, 'success');
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

  const authController = loadWithSupabaseMock('../controllers/auth.controller.js', mockSupabase);

  const req = {
    body: {
      email: 'student@example.com',
      selected_question_answer: q1,
      new_password: 'NewPass123',
    },
    headers: { 'user-agent': 'test-agent' },
    socket: { remoteAddress: '127.0.0.1' },
  };

  let statusCode = 200;
  let payload = null;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      payload = body;
      return this;
    },
  };

  await authController.verifySecurityQuestions(req, res);

  assert.equal(statusCode, 200);
  assert.equal(payload.verified, true);
  assert.equal(calls.updateUserById, 1);
  assert.equal(calls.usersUpdate, 1);
  assert.equal(calls.auditInsert, 1);
});

test('getCredentialDeliveryByToken returns valid credentials without consuming token', async () => {
  const calls = { tokenUpdate: 0 };

  const mockSupabase = {
    from(table) {
      if (table !== 'credential_delivery_tokens') {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select() {
          return this;
        },
        eq(column, value) {
          if (column === 'token') {
            assert.equal(value, 'tok-123');
            return {
              async maybeSingle() {
                return {
                  data: {
                    id: 'row-1',
                    target_email: 'new.user@example.com',
                    temporary_password: 'Tmp12345',
                    expires_at: new Date(Date.now() + 60_000).toISOString(),
                    consumed_at: null,
                  },
                  error: null,
                };
              },
            };
          }

          if (column === 'id') {
            calls.tokenUpdate += 1;
            assert.equal(value, 'row-1');
            return Promise.resolve({ error: null });
          }

          return this;
        },
        update(payload) {
          assert.ok(payload.consumed_at);
          return this;
        },
      };
    },
  };

  const authController = loadWithSupabaseMock('../controllers/auth.controller.js', mockSupabase);

  const req = { params: { token: 'tok-123' } };
  let statusCode = 200;
  let payload = null;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      payload = body;
      return this;
    },
  };

  await authController.getCredentialDeliveryByToken(req, res);

  assert.equal(statusCode, 200);
  assert.equal(payload.email, 'new.user@example.com');
  assert.equal(payload.temporary_password, 'Tmp12345');
  assert.equal(payload.consumed, false);
  assert.equal(calls.tokenUpdate, 0);
});

test('consumeCredentialDeliveryToken marks token consumed for matching authenticated user', async () => {
  const calls = { tokenUpdate: 0 };

  const mockSupabase = {
    from(table) {
      if (table !== 'credential_delivery_tokens') {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select() {
          return this;
        },
        eq(column, value) {
          if (column === 'token') {
            assert.equal(value, 'tok-456');
            return {
              async maybeSingle() {
                return {
                  data: {
                    id: 'row-2',
                    target_user_id: 'user-1',
                    target_email: 'new.user@example.com',
                    expires_at: new Date(Date.now() + 60_000).toISOString(),
                    consumed_at: null,
                  },
                  error: null,
                };
              },
            };
          }

          if (column === 'id') {
            assert.equal(value, 'row-2');
            return this;
          }

          return this;
        },
        is(column, value) {
          assert.equal(column, 'consumed_at');
          assert.equal(value, null);
          return this;
        },
        update(payload) {
          calls.tokenUpdate += 1;
          assert.ok(payload.consumed_at);
          return this;
        },
        async maybeSingle() {
          return { data: { id: 'row-2' }, error: null };
        },
      };
    },
  };

  const authController = loadWithSupabaseMock('../controllers/auth.controller.js', mockSupabase);

  const req = {
    params: { token: 'tok-456' },
    userId: 'user-1',
    user: { email: 'new.user@example.com' },
  };
  let statusCode = 200;
  let payload = null;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      payload = body;
      return this;
    },
  };

  await authController.consumeCredentialDeliveryToken(req, res);

  assert.equal(statusCode, 200);
  assert.equal(payload.consumed, true);
  assert.equal(calls.tokenUpdate, 1);
});
