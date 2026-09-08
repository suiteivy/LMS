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

test('adminResetPassword with otpReset triggers session revocation and OTP dispatch without returning plaintext password', async () => {
  const auditLogs = [];
  let userUpdated = false;

  const mockSupabase = {
    auth: {
      admin: {
        updateUserById(userId, payload) {
          assert.equal(userId, 'target-user-1');
          assert.ok(payload.password);
          assert.ok(payload.password.length <= 72, `Password length ${payload.password.length} exceeds 72 characters`);
          assert.ok(payload.password.length >= 6, `Password length ${payload.password.length} is less than 6 characters`);
          return Promise.resolve({ error: null });
        },
      },
    },
    from(table) {
      return {
        select() {
          return {
            eq() {
              return {
                single() {
                  return Promise.resolve({
                    data: { id: 'target-user-1', email: 'user1@example.com', role: 'student', full_name: 'User One', institution_id: 'inst-1' },
                    error: null,
                  });
                },
              };
            },
          };
        },
        update(payload) {
          userUpdated = true;
          const chain = {
            eq() {
              return chain;
            },
            then(resolve) {
              resolve({ error: null });
            },
          };
          return chain;
        },
        delete() {
          return {
            eq() {
              return Promise.resolve({ error: null });
            },
          };
        },
        insert(payload) {
          if (table === 'password_audit_logs') {
            auditLogs.push(payload);
          }
          return Promise.resolve({ error: null });
        },
      };
    },
  };

  const authController = loadWithSupabaseMock('../controllers/auth.controller.js', mockSupabase);

  const req = {
    body: { targetUserId: 'target-user-1', otpReset: true },
    userId: 'master-admin-1',
    userRole: 'master_admin',
    headers: { 'user-agent': 'node-test' },
    socket: { remoteAddress: '127.0.0.1' },
  };

  const res = createRes();
  await authController.adminResetPassword(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.otp_dispatched, true);
  assert.equal(res.payload.force_logout, true);
  assert.equal(res.payload.tempPassword, undefined);
  assert.ok(!res.payload.generated_password);
  assert.equal(userUpdated, true);
  assert.equal(auditLogs.length, 1);
  assert.equal(auditLogs[0].action, 'admin_reset_credentials_otp');
  assert.equal(auditLogs[0].outcome, 'success');
});

test('adminResetPassword rejects password longer than 72 characters with 400', async () => {
  const mockSupabase = {
    auth: { admin: { updateUserById: () => Promise.resolve({ error: null }) } },
    from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: 'target-1' }, error: null }) }) }) }),
  };

  const authController = loadWithSupabaseMock('../controllers/auth.controller.js', mockSupabase);

  const req = {
    body: { targetUserId: 'target-1', newPassword: 'A'.repeat(73) },
    userId: 'master-admin-1',
    userRole: 'master_admin',
    headers: { 'user-agent': 'node-test' },
    socket: { remoteAddress: '127.0.0.1' },
  };

  const res = createRes();
  await authController.adminResetPassword(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.error, 'Password cannot be longer than 72 characters');
});

test('addInstitutionAdmin enforces beta plan limit of 2 admins', async () => {
  const mockSupabase = {
    from(table) {
      if (table === 'institutions') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { id: 'inst-beta-1', name: 'Beta School', subscription_plan: 'beta', email_domain: 'beta.edu' },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'admins') {
        return {
          select: () => ({
            eq: async () => ({
              data: [{ user_id: 'admin-1' }, { user_id: 'admin-2' }],
              error: null,
            }),
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  };

  const masterAdminController = loadWithSupabaseMock('../controllers/master_admin.controller.js', mockSupabase);
  masterAdminController.__setServiceClientFactory(() => mockSupabase);

  const req = {
    params: { id: 'inst-beta-1' },
    body: { first_name: 'Secondary', last_name: 'Admin' },
    userId: 'master-admin-1',
    userRole: 'master_admin',
  };

  const res = createRes();
  await masterAdminController.addInstitutionAdmin(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.payload.code, 'ADMIN_LIMIT_REACHED');
  assert.equal(res.payload.current_count, 2);
  assert.equal(res.payload.max_admins, 2);
});

test('addInstitutionAdmin allows creating admin under plan capacity', async () => {
  let createdAuthUser = null;
  let insertedUserProfile = null;
  let insertedAdminRow = null;

  const mockSupabase = {
    auth: {
      admin: {
        async createUser(params) {
          createdAuthUser = params;
          return { data: { user: { id: 'new-admin-user-id' } }, error: null };
        },
      },
    },
    from(table) {
      if (table === 'institutions') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { id: 'inst-beta-1', name: 'Beta School', subscription_plan: 'beta', email_domain: 'beta.edu' },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'admins') {
        return {
          select: () => ({
            eq: async () => ({
              data: [{ user_id: 'admin-1' }], // 1 existing admin out of 2 allowed
              error: null,
            }),
          }),
          insert: async (rows) => {
            insertedAdminRow = Array.isArray(rows) ? rows[0] : rows;
            return { error: null };
          },
          upsert: async (row) => {
            insertedAdminRow = row;
            return { error: null };
          },
        };
      }
      if (table === 'users') {
        return {
          select: () => ({
            ilike: () => ({
              limit: async () => ({ data: [], error: null }),
            }),
          }),
          upsert: async (row) => {
            insertedUserProfile = row;
            return { error: null };
          },
        };
      }
      if (table === 'credential_delivery_tokens') {
        return {
          insert: async () => ({ error: null }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  };

  const masterAdminController = loadWithSupabaseMock('../controllers/master_admin.controller.js', mockSupabase);
  masterAdminController.__setServiceClientFactory(() => mockSupabase);

  const req = {
    params: { id: 'inst-beta-1' },
    body: { first_name: 'John', last_name: 'Doe' },
    userId: 'master-admin-1',
    userRole: 'master_admin',
  };

  const res = createRes();
  await masterAdminController.addInstitutionAdmin(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.admin.first_name, 'John');
  assert.equal(res.payload.admin.last_name, 'Doe');
  assert.equal(res.payload.admin.is_main, false);
  assert.ok(res.payload.temporary_credentials.password);
  assert.equal(insertedAdminRow.is_main, false);
  assert.equal(insertedAdminRow.user_id, 'new-admin-user-id');
  assert.equal(insertedUserProfile.role, 'admin');
  assert.equal(insertedUserProfile.must_change_password, true);
  assert.equal(insertedUserProfile.requires_security_questions_setup, true);
});

test('adminResetPassword allows institution admin to reset credentials for user in their institution without newPassword', async () => {
  let userUpdated = false;
  let sessionsRevoked = false;
  let updatedPassword = null;
  const auditLogs = [];

  const mockSupabase = {
    auth: {
      admin: {
        updateUserById(userId, payload) {
          assert.equal(userId, 'target-student-1');
          assert.ok(payload.password);
          updatedPassword = payload.password;
          return Promise.resolve({ error: null });
        },
      },
    },
    from(table) {
      if (table === 'users') {
        return {
          select(fields) {
            return {
              eq(field, val) {
                return {
                  single() {
                    return Promise.resolve({
                      data: {
                        id: 'target-student-1',
                        email: 'student1@school.org',
                        role: 'student',
                        full_name: 'Student One',
                        institution_id: 'school-inst-1',
                      },
                      error: null,
                    });
                  },
                };
              },
            };
          },
          update(payload) {
            userUpdated = true;
            assert.equal(payload.must_change_password, true);
            assert.equal(payload.requires_security_questions_setup, true);
            return {
              eq() {
                return Promise.resolve({ error: null });
              },
            };
          },
        };
      }
      if (table === 'user_sessions') {
        return {
          update(payload) {
            sessionsRevoked = true;
            return {
              eq() {
                return {
                  eq() {
                    return Promise.resolve({ error: null });
                  },
                };
              },
            };
          },
        };
      }
      if (table === 'credential_delivery_tokens') {
        return {
          insert(payload) {
            return Promise.resolve({ error: null });
          },
        };
      }
      if (table === 'password_audit_logs') {
        return {
          insert(payload) {
            auditLogs.push(payload);
            return Promise.resolve({ error: null });
          },
        };
      }
      throw new Error(`Unexpected table in mock: ${table}`);
    },
  };

  const authController = loadWithSupabaseMock('../controllers/auth.controller.js', mockSupabase);

  const req = {
    body: { targetUserId: 'target-student-1' },
    userId: 'admin-1',
    userRole: 'admin',
    institution_id: 'school-inst-1',
    isMain: true,
    headers: { 'user-agent': 'node-test' },
    socket: { remoteAddress: '127.0.0.1' },
  };

  const res = createRes();
  await authController.adminResetPassword(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.generated_password, true);
  assert.ok(res.payload.tempPassword);
  assert.equal(res.payload.tempPassword, updatedPassword);
  assert.equal(res.payload.force_logout, true);
  assert.equal(res.payload.must_change_password, true);
  assert.equal(res.payload.requires_security_questions_setup, true);
  assert.ok(res.payload.credential_delivery);
  assert.equal(userUpdated, true);
  assert.equal(sessionsRevoked, true);
  assert.ok(auditLogs.length >= 1);
  assert.equal(auditLogs[0].outcome, 'success');
});

test('adminResetPassword denies institution admin resetting credentials for user in different institution', async () => {
  const auditLogs = [];

  const mockSupabase = {
    from(table) {
      if (table === 'users') {
        return {
          select() {
            return {
              eq() {
                return {
                  single() {
                    return Promise.resolve({
                      data: {
                        id: 'target-other-inst',
                        email: 'other@other.org',
                        role: 'student',
                        full_name: 'Other Student',
                        institution_id: 'other-inst-2',
                      },
                      error: null,
                    });
                  },
                };
              },
            };
          },
        };
      }
      if (table === 'password_audit_logs') {
        return {
          insert(payload) {
            auditLogs.push(payload);
            return Promise.resolve({ error: null });
          },
        };
      }
      throw new Error(`Unexpected table in mock: ${table}`);
    },
  };

  const authController = loadWithSupabaseMock('../controllers/auth.controller.js', mockSupabase);

  const req = {
    body: { targetUserId: 'target-other-inst' },
    userId: 'admin-1',
    userRole: 'admin',
    institution_id: 'school-inst-1',
    isMain: true,
    headers: { 'user-agent': 'node-test' },
    socket: { remoteAddress: '127.0.0.1' },
  };

  const res = createRes();
  await authController.adminResetPassword(req, res);

  assert.equal(res.statusCode, 403);
  assert.match(res.payload.error, /different institution/i);
  assert.equal(auditLogs.length, 1);
  assert.equal(auditLogs[0].outcome, 'failure');
  assert.equal(auditLogs[0].reason, 'cross_institution_denied');
});

