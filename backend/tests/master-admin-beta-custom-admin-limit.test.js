const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const masterAdminControllerPath = path.resolve(__dirname, '../controllers/master_admin.controller.js');
const authControllerPath = path.resolve(__dirname, '../controllers/auth.controller.js');
const supabaseModulePath = path.resolve(__dirname, '../utils/supabaseClient.js');

function createRes() {
  const state = { statusCode: 200, body: null };
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

function createMockSupabase(handlers = {}) {
  const defaultCurrencies = () => ({
    select: () => ({
      eq: () => ({
        maybeSingle: () => Promise.resolve({ data: { id: 'curr-1', is_active: true }, error: null }),
      }),
      order: () => ({
        limit: () => ({
          maybeSingle: () => Promise.resolve({ data: { id: 'curr-1', is_active: true }, error: null }),
        }),
      }),
    }),
  });

  const mergedHandlers = {
    currencies: defaultCurrencies,
    ...handlers,
  };

  return {
    auth: {
      admin: {
        createUser: () => Promise.resolve({ data: { user: { id: 'auth-user-1' } }, error: null }),
      },
    },
    from(table) {
      if (mergedHandlers[table]) {
        return mergedHandlers[table]();
      }
      const chain = {
        select: () => chain,
        insert: () => chain,
        upsert: () => chain,
        eq: () => chain,
        update: () => chain,
        delete: () => chain,
        eq: () => chain,
        in: () => chain,
        ilike: () => chain,
        order: () => chain,
        limit: () => chain,
        single: () => Promise.resolve({ data: null, error: null }),
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        then: (resolve) => resolve({ data: [], error: null }),
      };
      return chain;
    },
  };
}

test('enrollInstitution rejects non-positive or non-integer custom_admin_limit for beta', async () => {
  const mockClient = createMockSupabase();
  const controller = require(masterAdminControllerPath);
  controller.__setServiceClientFactory(() => mockClient);

  // Test 0
  const req0 = {
    userRole: 'master_admin',
    body: {
      institution_name: 'Test Beta School',
      email_domain: 'beta.school.edu',
      subscription_plan: 'beta',
      currency_id: 'curr-1',
      custom_student_limit: 50,
      custom_admin_limit: 0,
      admin_first_name: 'Jane',
      admin_last_name: 'Doe',
    },
  };
  const res0 = createRes();
  await controller.enrollInstitution(req0, res0);
  assert.equal(res0.state.statusCode, 400);
  assert.match(res0.state.body.error, /custom_admin_limit must be a positive whole number/);

  // Test negative
  const reqNeg = {
    userRole: 'master_admin',
    body: {
      institution_name: 'Test Beta School',
      email_domain: 'beta.school.edu',
      subscription_plan: 'beta',
      currency_id: 'curr-1',
      custom_student_limit: 50,
      custom_admin_limit: -5,
      admin_first_name: 'Jane',
      admin_last_name: 'Doe',
    },
  };
  const resNeg = createRes();
  await controller.enrollInstitution(reqNeg, resNeg);
  assert.equal(resNeg.state.statusCode, 400);
  assert.match(resNeg.state.body.error, /custom_admin_limit must be a positive whole number/);

  // Test non-integer (decimal)
  const reqDec = {
    userRole: 'master_admin',
    body: {
      institution_name: 'Test Beta School',
      email_domain: 'beta.school.edu',
      subscription_plan: 'beta',
      currency_id: 'curr-1',
      custom_student_limit: 50,
      custom_admin_limit: 3.5,
      admin_first_name: 'Jane',
      admin_last_name: 'Doe',
    },
  };
  const resDec = createRes();
  await controller.enrollInstitution(reqDec, resDec);
  assert.equal(resDec.state.statusCode, 400);
  assert.match(resDec.state.body.error, /custom_admin_limit must be a positive whole number/);
});

test('enrollInstitution stores custom_admin_limit when valid for beta', async () => {
  let insertedData = null;
  const mockClient = createMockSupabase({
    institutions: () => {
      const chain = {
        select: () => chain,
        insert: (data) => {
          insertedData = data[0];
          return chain;
        },
        single: () => Promise.resolve({ data: { id: 'new-beta-id' }, error: null }),
        then: (resolve) => resolve({ data: { id: 'new-beta-id' }, error: null }),
      };
      return chain;
    },
    users: () => {
      const chain = {
        select: () => chain,
        ilike: () => chain,
        limit: () => chain,
        insert: () => chain,
        upsert: () => chain,
        eq: () => chain,
        single: () => Promise.resolve({ data: { id: 'user-id-1' }, error: null }),
        then: (resolve) => resolve({ data: [], error: null }),
      };
      return chain;
    },
    admins: () => {
      const chain = {
        insert: () => chain,
        update: () => chain,
        select: () => chain,
        eq: () => chain,
        then: (resolve) => resolve({ data: null, error: null }),
      };
      return chain;
    },
    school_categories: () => ({
      select: () => ({
        in: () => Promise.resolve({ data: [{ id: 'cat-1' }], error: null }),
      }),
    }),
  });

  const controller = require(masterAdminControllerPath);
  controller.__setServiceClientFactory(() => mockClient);

  const req = {
    userRole: 'master_admin',
    body: {
      institution_name: 'Beta Custom School',
      email_domain: 'betacustom.edu',
      subscription_plan: 'beta',
      currency_id: 'curr-1',
      custom_student_limit: 60,
      custom_admin_limit: 5,
      admin_first_name: 'Alex',
      admin_last_name: 'Mercer',
      category_ids: ['cat-1'],
    },
  };
  const res = createRes();
  await controller.enrollInstitution(req, res);
  assert.equal(res.state.statusCode, 201);
  assert.ok(insertedData);
  assert.equal(insertedData.custom_admin_limit, 5);
  assert.equal(insertedData.custom_student_limit, 60);
});

test('updateInstitutionDetails rejects non-positive custom_admin_limit', async () => {
  const mockClient = createMockSupabase();
  const controller = require(masterAdminControllerPath);
  controller.__setServiceClientFactory(() => mockClient);

  const req = {
    userRole: 'master_admin',
    params: { id: 'inst-123' },
    body: {
      custom_admin_limit: -1,
    },
  };
  const res = createRes();
  await controller.updateInstitutionDetails(req, res);
  assert.equal(res.state.statusCode, 400);
  assert.match(res.state.body.error, /custom_admin_limit must be a positive whole number/);
});

test('updateInstitutionDetails updates custom_admin_limit', async () => {
  let updatedPayload = null;
  const mockClient = createMockSupabase({
    institutions: () => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        single: () => Promise.resolve({
          data: { id: 'inst-beta-upd', subscription_plan: 'beta', custom_admin_limit: 2 },
          error: null,
        }),
        update: (payload) => {
          updatedPayload = payload;
          return chain;
        },
      };
      return chain;
    },
  });

  const controller = require(masterAdminControllerPath);
  controller.__setServiceClientFactory(() => mockClient);

  const req = {
    userRole: 'master_admin',
    params: { id: 'inst-beta-upd' },
    body: {
      custom_admin_limit: 8,
    },
  };
  const res = createRes();
  await controller.updateInstitutionDetails(req, res);
  assert.equal(res.state.statusCode, 200);
  assert.ok(updatedPayload);
  assert.equal(updatedPayload.custom_admin_limit, 8);
});

test('getInstitutionDetails resolves max_admins from custom_admin_limit for beta', async () => {
  const mockClient = createMockSupabase({
    institutions: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: {
              id: 'inst-beta-1',
              name: 'Beta Custom School',
              subscription_plan: 'beta',
              custom_student_limit: 100,
              custom_admin_limit: 5,
            },
            error: null,
          }),
        }),
      }),
    }),
    admins: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({
            data: [
              { is_main: true, users: { id: 'u1', first_name: 'A', last_name: 'B' } },
              { is_main: false, users: { id: 'u2', first_name: 'C', last_name: 'D' } },
            ],
            error: null,
          }),
        }),
      }),
    }),
    institution_categories: () => ({
      select: () => ({
        in: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  });

  const controller = require(masterAdminControllerPath);
  controller.__setServiceClientFactory(() => mockClient);

  const req = { params: { id: 'inst-beta-1' } };
  const res = createRes();

  await controller.getInstitutionDetails(req, res);
  assert.equal(res.state.statusCode, 200);
  assert.equal(res.state.body.institution.max_admins, 5);
  assert.equal(res.state.body.institution.admin_count, 2);
  assert.equal(res.state.body.institution.at_admin_capacity, false);
});

test('addInstitutionAdmin enforces custom_admin_limit capacity for beta', async () => {
  const mockClient = createMockSupabase({
    institutions: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: {
              id: 'inst-beta-capped',
              name: 'Capped Beta School',
              email_domain: 'capped.edu',
              subscription_plan: 'beta',
              subscription_status: 'active',
              custom_admin_limit: 2,
            },
            error: null,
          }),
        }),
      }),
    }),
    admins: () => ({
      select: () => ({
        eq: () => Promise.resolve({
          data: [
            { user_id: 'u1' },
            { user_id: 'u2' },
          ],
          error: null,
        }),
      }),
    }),
  });

  const controller = require(masterAdminControllerPath);
  controller.__setServiceClientFactory(() => mockClient);

  const req = {
    params: { id: 'inst-beta-capped' },
    body: {
      first_name: 'John',
      last_name: 'Smith',
      email: 'john@capped.edu',
    },
  };
  const res = createRes();

  await controller.addInstitutionAdmin(req, res);
  assert.equal(res.state.statusCode, 403);
  assert.equal(res.state.body.code, 'ADMIN_LIMIT_REACHED');
  assert.equal(res.state.body.max_admins, 2);
  assert.match(res.state.body.error, /max 2 admins/);
});

test('authController slot capacity resolves custom_admin_limit for beta', async () => {
  delete require.cache[authControllerPath];
  delete require.cache[supabaseModulePath];

  let currentRole = '';
  const mockSupabase = {
    from(table) {
      if (table === 'institutions') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: {
                  id: 'inst-beta-slot',
                  subscription_plan: 'beta',
                  custom_student_limit: 40,
                  custom_admin_limit: 4,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'users') {
        return {
          select: () => ({
            eq: (col, val) => {
              if (col === 'role') currentRole = val;
              return {
                eq: (col2, val2) => {
                  if (col2 === 'role') currentRole = val2;
                  const count = currentRole === 'student' ? 10 : 3;
                  return Promise.resolve({ count, error: null });
                },
              };
            },
          }),
        };
      }
      return {
        select: () => ({
          eq: () => Promise.resolve({ data: null, error: null }),
        }),
      };
    },
  };

  require.cache[supabaseModulePath] = {
    id: supabaseModulePath,
    filename: supabaseModulePath,
    loaded: true,
    exports: mockSupabase,
  };

  const authController = require(authControllerPath);
  const req = {
    params: { institutionId: 'inst-beta-slot' },
    userRole: 'admin',
    institution_id: 'inst-beta-slot',
  };
  const res = createRes();

  await authController.getEnrollmentSlotCapacity(req, res);
  assert.equal(res.state.statusCode, 200);
  assert.equal(res.state.body.plan, 'beta');
  assert.equal(res.state.body.limits.student, 40);
  assert.equal(res.state.body.limits.admin, 4);
  assert.equal(res.state.body.usage.admin, 3);
  assert.equal(res.state.body.remaining.admin, 1);
  assert.equal(res.state.body.at_capacity.admin, false);
});
