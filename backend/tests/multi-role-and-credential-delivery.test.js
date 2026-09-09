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

test('adminResetPassword generates credential_delivery and human-readable expiry even when newPassword is provided', async () => {
  let passwordUpdated = null;
  let userFlagUpdated = null;
  let sessionsRevoked = false;

  const mockSupabase = {
    auth: {
      admin: {
        async updateUserById(userId, payload) {
          assert.equal(userId, 'target-student-1');
          passwordUpdated = payload.password;
          return { data: { user: { id: userId } }, error: null };
        },
      },
    },
    from(table) {
      if (table === 'users') {
        return {
          select() {
            return {
              eq(col, val) {
                assert.equal(col, 'id');
                assert.equal(val, 'target-student-1');
                return {
                  async single() {
                    return {
                      data: {
                        id: 'target-student-1',
                        institution_id: 'school-inst-1',
                        email: 'student@school.com',
                        first_name: 'Jane',
                        last_name: 'Doe',
                        role: 'student',
                      },
                      error: null,
                    };
                  },
                };
              },
            };
          },
          update(data) {
            userFlagUpdated = data;
            return {
              eq() {
                return Promise.resolve({ data: null, error: null });
              },
            };
          },
        };
      }

      if (table === 'credential_delivery_tokens') {
        return {
          insert(payload) {
            return Promise.resolve({ data: null, error: null });
          },
        };
      }

      if (table === 'user_sessions') {
        return {
          update() {
            return {
              eq(col1, val1) {
                if (col1 === 'user_id' && val1 === 'target-student-1') {
                  sessionsRevoked = true;
                }
                return {
                  eq() {
                    return Promise.resolve({ data: null, error: null });
                  },
                };
              },
            };
          },
        };
      }

      if (table === 'password_audit_logs') {
        return {
          insert() {
            return Promise.resolve({ data: null, error: null });
          },
        };
      }

      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        async single() {
          return { data: null, error: null };
        },
      };
    },
  };

  const { adminResetPassword } = loadWithSupabaseMock(
    '../controllers/auth.controller.js',
    mockSupabase
  );

  const req = {
    body: { targetUserId: 'target-student-1', newPassword: 'SpecifiedSecretPass123!' },
    userId: 'admin-1',
    userRole: 'admin',
    institution_id: 'school-inst-1',
    isMain: true,
    headers: { 'user-agent': 'node-test' },
    socket: { remoteAddress: '127.0.0.1' },
  };

  const res = createRes();
  await adminResetPassword(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(passwordUpdated, 'SpecifiedSecretPass123!');
  assert.equal(res.payload.tempPassword, 'SpecifiedSecretPass123!');
  assert.equal(res.payload.generated_password, false);
  assert.ok(sessionsRevoked, 'Active sessions should be revoked');
  assert.ok(userFlagUpdated?.must_change_password, 'must_change_password flag should be set');

  // Verify credential_delivery is present and formatted
  assert.ok(res.payload.credential_delivery, 'credential_delivery object must be returned');
  assert.ok(res.payload.credential_delivery.url, 'credential_delivery.url must be present');
  assert.ok(res.payload.credential_delivery.expiresAt, 'credential_delivery.expiresAt must be present');
  assert.ok(res.payload.credential_delivery.expiresAtFormatted, 'credential_delivery.expiresAtFormatted must be present');

  // Verify expiry is human-readable and NOT raw ISO
  const formatted = res.payload.credential_delivery.expiresAtFormatted;
  assert.equal(/^\d{4}-\d{2}-\d{2}T/.test(formatted), false, `Expiry should be human-readable, not ISO: ${formatted}`);
  assert.ok(formatted.includes('Expires in') || formatted.includes('Valid for'), `Expiry should have descriptive prefix: ${formatted}`);

  // Verify credential_document contains human-readable expiry
  assert.ok(res.payload.credential_document, 'credential_document must be returned');
  assert.ok(res.payload.credential_document.includes('Link expires:'), 'credential_document must include Link expires');
  assert.equal(res.payload.credential_document.includes('Z\n'), false, 'credential_document should not have raw ISO Z timestamp');
});

test('adminUpdateUser allows assigning teacher role and class teacher position to an admin', async () => {
  let userUpdated = null;
  let teacherUpserted = null;
  let classTeacherAssigned = null;

  const mockSupabase = {
    from(table) {
      if (table === 'users') {
        return {
          select() {
            return this;
          },
          eq(col, val) {
            return {
              async single() {
                return {
                  data: {
                    id: 'admin-user-1',
                    institution_id: 'school-inst-1',
                    email: 'admin@school.com',
                    role: 'admin',
                  },
                  error: null,
                };
              },
            };
          },
          update(data) {
            userUpdated = data;
            return {
              eq() {
                return Promise.resolve({ data: null, error: null });
              },
            };
          },
        };
      }

      if (table === 'teachers') {
        return {
          select() {
            return this;
          },
          eq() {
            return {
              async maybeSingle() {
                return { data: null, error: null };
              },
              async single() {
                return { data: null, error: null };
              },
            };
          },
          insert(payload) {
            teacherUpserted = payload;
            return {
              select() {
                return {
                  async single() {
                    return {
                      data: {
                        id: 'tea-generated-1',
                        user_id: payload.user_id,
                        position: payload.position,
                      },
                      error: null,
                    };
                  },
                };
              },
            };
          },
          update(payload) {
            teacherUpserted = { ...teacherUpserted, ...payload };
            return {
              eq() {
                return Promise.resolve({ data: null, error: null });
              },
            };
          },
          upsert(payload) {
            teacherUpserted = payload;
            return {
              select() {
                return {
                  async single() {
                    return {
                      data: {
                        id: 'tea-generated-1',
                        user_id: payload.user_id,
                        position: payload.position,
                      },
                      error: null,
                    };
                  },
                };
              },
            };
          },
        };
      }

      if (table === 'classes') {
        return {
          update(payload) {
            classTeacherAssigned = payload;
            return {
              eq() {
                return Promise.resolve({ data: null, error: null });
              },
            };
          },
        };
      }

      if (table === 'subjects') {
        return {
          update() {
            return {
              eq() {
                return Promise.resolve({ data: null, error: null });
              },
              in() {
                return Promise.resolve({ data: null, error: null });
              },
            };
          },
        };
      }

      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        async single() {
          return { data: null, error: null };
        },
      };
    },
  };

  const { adminUpdateUser } = loadWithSupabaseMock(
    '../controllers/auth.controller.js',
    mockSupabase
  );

  const req = {
    userId: 'main-admin-1',
    userRole: 'admin',
    institution_id: 'school-inst-1',
    isMain: true,
    params: { id: 'admin-user-1' },
    body: {
      teacher_role_enabled: true,
      department: 'Sciences',
      specialization: 'Physics',
      position: 'class_teacher',
      class_teacher_id: 'class-grade-10a',
    },
  };

  const res = createRes();
  await adminUpdateUser(req, res);

  assert.equal(res.statusCode, 200);
  assert.ok(teacherUpserted, 'Teacher profile should be upserted');
  assert.equal(teacherUpserted.user_id, 'admin-user-1');
  assert.equal(teacherUpserted.position, 'class_teacher');
  assert.equal(teacherUpserted.department, 'Sciences');
  assert.equal(classTeacherAssigned?.teacher_id, 'tea-generated-1');
});
