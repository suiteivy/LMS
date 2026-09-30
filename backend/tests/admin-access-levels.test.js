const test = require('node:test');
const assert = require('node:assert/strict');
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

function createRes() {
  let statusCode = 200;
  let payload = null;
  return {
    get statusCode() {
      return statusCode;
    },
    get payload() {
      return payload;
    },
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      payload = body;
      return this;
    },
  };
}

test('Admin Access Levels - Centralized Policy Guard & Administration', async (t) => {
  await t.test('read_only admin is blocked on mutation endpoints with 403 ADMIN_READ_ONLY', async () => {
    const mockSupabase = {
      auth: {
        async getUser() {
          return { data: { user: { id: 'admin-ro-1', email: 'ro@school.com' } }, error: null };
        }
      },
      from(table) {
        if (table === 'user_sessions') {
          return {
            select() { return this; },
            eq() { return this; },
            maybeSingle: async () => ({ data: null, error: null }),
            update() { return this; },
          };
        }
        if (table === 'users') {
          return {
            select() { return this; },
            eq() { return this; },
            maybeSingle: async () => ({
              data: {
                id: 'admin-ro-1',
                email: 'ro@school.com',
                role: 'admin',
                institution_id: 'inst-1',
                is_active: true,
                admins: [{ id: 'adm-ro-1', is_main: false, can_manage_users: false, access_level: 'read_only' }]
              },
              error: null
            }),
          };
        }
        if (table === 'user_roles') {
          return {
            select() { return this; },
            eq: async () => ({ data: [], error: null })
          };
        }
        if (table === 'finance_admin_designations') {
          return {
            select() { return this; },
            eq() { return this; },
            maybeSingle: async () => ({ data: null, error: null })
          };
        }
        throw new Error(`Unexpected table ${table}`);
      }
    };

    const { authMiddleware, clearUserCache } = loadWithSupabaseMock('../middleware/auth.middleware.js', mockSupabase);
    clearUserCache('admin-ro-1');

    const req = {
      headers: { authorization: 'Bearer token-ro-admin' },
      url: '/api/subjects',
      originalUrl: '/api/subjects',
      path: '/api/subjects',
      method: 'POST',
      body: { title: 'Unauthorized Subject' }
    };
    const res = createRes();
    let nextCalled = false;

    await authMiddleware(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false, 'next() must NOT be called for read-only admin mutation');
    assert.equal(res.statusCode, 403);
    assert.equal(res.payload?.code, 'ADMIN_READ_ONLY');
    assert.equal(res.payload?.error, 'Read-only access: you do not have permission to modify data.');
  });

  await t.test('read_only admin is allowed on GET and whitelisted endpoints', async () => {
    const mockSupabase = {
      auth: {
        async getUser() {
          return { data: { user: { id: 'admin-ro-2', email: 'ro2@school.com' } }, error: null };
        }
      },
      from(table) {
        if (table === 'user_sessions') {
          return {
            select() { return this; },
            eq() { return this; },
            maybeSingle: async () => ({ data: null, error: null }),
            update() { return this; },
          };
        }
        if (table === 'users') {
          return {
            select() { return this; },
            eq() { return this; },
            maybeSingle: async () => ({
              data: {
                id: 'admin-ro-2',
                email: 'ro2@school.com',
                role: 'admin',
                institution_id: 'inst-1',
                is_active: true,
                admins: [{ id: 'adm-ro-2', is_main: false, can_manage_users: false, access_level: 'read_only' }]
              },
              error: null
            }),
          };
        }
        if (table === 'user_roles') {
          return {
            select() { return this; },
            eq: async () => ({ data: [], error: null })
          };
        }
        if (table === 'finance_admin_designations') {
          return {
            select() { return this; },
            eq() { return this; },
            maybeSingle: async () => ({ data: null, error: null })
          };
        }
        throw new Error(`Unexpected table ${table}`);
      }
    };

    const { authMiddleware, clearUserCache } = loadWithSupabaseMock('../middleware/auth.middleware.js', mockSupabase);
    clearUserCache('admin-ro-2');

    // 1. GET is allowed
    let nextCalled = false;
    const reqGet = {
      headers: { authorization: 'Bearer token-ro-admin' },
      url: '/api/subjects',
      originalUrl: '/api/subjects',
      path: '/api/subjects',
      method: 'GET'
    };
    await authMiddleware(reqGet, createRes(), () => { nextCalled = true; });
    assert.equal(nextCalled, true, 'GET requests must pass through');

    // 2. Whitelisted POST /api/pdf/compile is allowed
    nextCalled = false;
    const reqPdf = {
      headers: { authorization: 'Bearer token-ro-admin' },
      url: '/api/pdf/compile',
      originalUrl: '/api/pdf/compile',
      path: '/api/pdf/compile',
      method: 'POST',
      body: {}
    };
    await authMiddleware(reqPdf, createRes(), () => { nextCalled = true; });
    assert.equal(nextCalled, true, 'Whitelisted pdf compile POST must pass through');
  });

  await t.test('read_write admin has full write permissions', async () => {
    const mockSupabase = {
      auth: {
        async getUser() {
          return { data: { user: { id: 'admin-rw-1', email: 'rw@school.com' } }, error: null };
        }
      },
      from(table) {
        if (table === 'user_sessions') {
          return {
            select() { return this; },
            eq() { return this; },
            maybeSingle: async () => ({ data: null, error: null }),
            update() { return this; },
          };
        }
        if (table === 'users') {
          return {
            select() { return this; },
            eq() { return this; },
            maybeSingle: async () => ({
              data: {
                id: 'admin-rw-1',
                email: 'rw@school.com',
                role: 'admin',
                institution_id: 'inst-1',
                is_active: true,
                admins: [{ id: 'adm-rw-1', is_main: true, can_manage_users: true, access_level: 'read_write' }]
              },
              error: null
            }),
          };
        }
        if (table === 'user_roles') {
          return {
            select() { return this; },
            eq: async () => ({ data: [], error: null })
          };
        }
        if (table === 'finance_admin_designations') {
          return {
            select() { return this; },
            eq() { return this; },
            maybeSingle: async () => ({ data: null, error: null })
          };
        }
        throw new Error(`Unexpected table ${table}`);
      }
    };

    const { authMiddleware, clearUserCache } = loadWithSupabaseMock('../middleware/auth.middleware.js', mockSupabase);
    clearUserCache('admin-rw-1');

    let nextCalled = false;
    const req = {
      headers: { authorization: 'Bearer token-rw-admin' },
      url: '/api/subjects',
      originalUrl: '/api/subjects',
      path: '/api/subjects',
      method: 'POST',
      body: { title: 'Authorized Subject' }
    };
    await authMiddleware(req, createRes(), () => { nextCalled = true; });
    assert.equal(nextCalled, true, 'read_write admin must pass through for mutation');
    assert.equal(req.accessLevel, 'read_write');
  });

  await t.test('updateAdminAccessLevel enforces main admin authority and main admin immutability', async () => {
    let updatedAccessLevel = null;
    const mockSupabase = {
      from(table) {
        if (table === 'admins') {
          return {
            select() { return this; },
            eq(col, val) {
              if (val === 'target-main-admin') {
                return {
                  maybeSingle: async () => ({
                    data: { id: 'a1', user_id: 'target-main-admin', institution_id: 'inst-1', is_main: true, access_level: 'read_write' },
                    error: null,
                  })
                };
              }
              if (val === 'target-sub-admin') {
                return {
                  maybeSingle: async () => ({
                    data: { id: 'a2', user_id: 'target-sub-admin', institution_id: 'inst-1', is_main: false, access_level: 'read_write' },
                    error: null,
                  }),
                  select() {
                    return {
                      single: async () => ({
                        data: { id: 'a2', user_id: 'target-sub-admin', institution_id: 'inst-1', is_main: false, can_manage_users: false, access_level: updatedAccessLevel },
                        error: null,
                      })
                    };
                  },
                  single: async () => ({
                    data: { id: 'a2', user_id: 'target-sub-admin', institution_id: 'inst-1', is_main: false, can_manage_users: false, access_level: updatedAccessLevel },
                    error: null,
                  })
                };
              }
              return { maybeSingle: async () => ({ data: null, error: null }) };
            },
            update(payload) {
              updatedAccessLevel = payload.access_level;
              return this;
            },
          };
        }
        if (table === 'audit_logs') {
          return { insert: async () => ({ error: null }) };
        }
        throw new Error(`Unexpected table ${table}`);
      }
    };

    const authController = loadWithSupabaseMock('../controllers/auth.controller.js', mockSupabase);

    // 1. Non-main admin cannot update access level
    const resForbidden = createRes();
    await authController.updateAdminAccessLevel(
      { userRole: 'admin', isMain: false, institution_id: 'inst-1', body: { targetAdminUserId: 'target-sub-admin', accessLevel: 'read_only' } },
      resForbidden
    );
    assert.equal(resForbidden.statusCode, 403);
    assert.equal(resForbidden.payload?.code, 'MAIN_ADMIN_REQUIRED');

    // 2. Main admin cannot be demoted to read_only
    const resMainImmutable = createRes();
    await authController.updateAdminAccessLevel(
      { userRole: 'admin', isMain: true, institution_id: 'inst-1', body: { targetAdminUserId: 'target-main-admin', accessLevel: 'read_only' } },
      resMainImmutable
    );
    assert.equal(resMainImmutable.statusCode, 400);
    assert.equal(resMainImmutable.payload?.code, 'MAIN_ADMIN_IMMUTABLE');

    // 3. Main admin can set sub-admin to read_only
    const resSuccess = createRes();
    await authController.updateAdminAccessLevel(
      { userRole: 'admin', isMain: true, userId: 'main-admin-id', institution_id: 'inst-1', body: { targetAdminUserId: 'target-sub-admin', accessLevel: 'read_only' } },
      resSuccess
    );
    assert.equal(resSuccess.statusCode, 200);
    assert.equal(updatedAccessLevel, 'read_only');
    assert.equal(resSuccess.payload?.admin?.access_level, 'read_only');
  });
});
