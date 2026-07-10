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

test('adminResetPassword denies non-main non-delegated admin', async () => {
  const mockSupabase = {
    auth: {
      admin: {
        async updateUserById() {
          throw new Error('Should not update password when access denied');
        },
      },
    },
    from(table) {
      if (table === 'users') {
        return {
          select() {
            return this;
          },
          eq(column, value) {
            assert.equal(column, 'id');
            assert.equal(value, 'target-user-1');
            return {
              async single() {
                return {
                  data: {
                    institution_id: 'inst-1',
                    role: 'teacher',
                    email: 'teacher@example.com',
                    full_name: 'Teacher One',
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
          async insert() {
            return { error: null };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };

  const authController = loadWithSupabaseMock('../controllers/auth.controller.js', mockSupabase);

  const req = {
    body: { targetUserId: 'target-user-1', newPassword: 'SecurePass1' },
    userId: 'admin-user-1',
    userRole: 'admin',
    institution_id: 'inst-1',
    isMain: false,
    user: {
      permissions: [],
      can_manage_users: false,
    },
    headers: { 'user-agent': 'node-test' },
    socket: { remoteAddress: '127.0.0.1' },
  };

  const res = createRes();
  await authController.adminResetPassword(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.payload?.code, 'ADMIN_USER_MANAGEMENT_DENIED');
});

test('transferMainAdmin updates delegation flags after successful transfer', async () => {
  const updates = [];

  const mockSupabase = {
    rpc(name, payload) {
      assert.equal(name, 'transfer_main_admin_status');
      assert.equal(payload.p_old_admin_user_id, 'old-admin');
      assert.equal(payload.p_new_admin_user_id, 'new-admin');
      return Promise.resolve({ error: null });
    },
    from(table) {
      if (table !== 'admins') {
        throw new Error(`Unexpected table: ${table}`);
      }

      const state = { kind: 'select', where: {} };
      return {
        select() {
          state.kind = 'select';
          return this;
        },
        update(payload) {
          state.kind = 'update';
          state.payload = payload;
          return this;
        },
        eq(column, value) {
          state.where[column] = value;

          if (state.kind === 'select') {
            if (state.where.user_id === 'old-admin') {
              return {
                async maybeSingle() {
                  return {
                    data: { institution_id: 'inst-1', is_main: true },
                    error: null,
                  };
                },
              };
            }

            if (state.where.user_id === 'new-admin') {
              return {
                async maybeSingle() {
                  return {
                    data: { institution_id: 'inst-1' },
                    error: null,
                  };
                },
              };
            }
          }

          if (state.kind === 'update' && column === 'user_id') {
            updates.push({ user_id: value, payload: state.payload });
            return Promise.resolve({ error: null });
          }

          return this;
        },
      };
    },
  };

  const authController = loadWithSupabaseMock('../controllers/auth.controller.js', mockSupabase);

  const req = {
    body: { targetAdminUserId: 'new-admin' },
    userId: 'old-admin',
  };

  const res = createRes();
  await authController.transferMainAdmin(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(updates.length, 2);
  assert.deepEqual(updates[0], { user_id: 'old-admin', payload: { can_manage_users: false } });
  assert.deepEqual(updates[1], { user_id: 'new-admin', payload: { can_manage_users: true } });
});
