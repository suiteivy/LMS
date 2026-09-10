const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const controllerPath = path.resolve(__dirname, '../controllers/finance.controller.js');
const supabaseModulePath = path.resolve(__dirname, '../utils/supabaseClient.js');
const resolveActiveTermModulePath = path.resolve(__dirname, '../utils/resolveActiveTerm.js');

function createSupabaseMock(resolver) {
  return {
    from(table) {
      const state = {
        table,
        filters: [],
      };

      const builder = {
        select(columns, options) {
          state.select = { columns, options };
          return this;
        },
        order(column, options) {
          state.order = state.order || [];
          state.order.push({ column, options });
          return this;
        },
        or(value) {
          state.or = value;
          return this;
        },
        insert(values) {
          state.insert = values;
          return this;
        },
        update(values) {
          state.update = values;
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
        range(from, to) {
          state.range = { from, to };
          state.terminal = 'range';
          return Promise.resolve(resolver(state));
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
  };
}

function loadControllerWithMocks({ supabaseMock, resolveActiveTermImpl }) {
  delete require.cache[controllerPath];
  delete require.cache[supabaseModulePath];
  delete require.cache[resolveActiveTermModulePath];

  require.cache[supabaseModulePath] = {
    id: supabaseModulePath,
    filename: supabaseModulePath,
    loaded: true,
    exports: supabaseMock,
  };

  require.cache[resolveActiveTermModulePath] = {
    id: resolveActiveTermModulePath,
    filename: resolveActiveTermModulePath,
    loaded: true,
    exports: {
      resolveActiveTerm: resolveActiveTermImpl || (async () => null),
    },
  };

  return require(controllerPath);
}

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

test('releaseFeeStructure enforces strict current pair by default', async () => {
  let updateCalled = false;

  const supabase = createSupabaseMock((state) => {
    if (state.table === 'fee_structures' && state.terminal === 'single' && !state.update) {
      return {
        data: {
          id: 'fee-1',
          institution_id: 'inst-1',
          is_active: false,
          term: 'Term 1',
          academic_year: '2026',
          term_id: 'term-1',
          academic_year_id: 'year-1',
          completed_at: null,
          released_at: null,
          status_updated_at: null,
        },
        error: null,
      };
    }

    if (state.table === 'fee_structures' && state.update) {
      updateCalled = true;
      return {
        data: {
          id: 'fee-1',
          institution_id: 'inst-1',
          is_active: true,
          term: 'Term 1',
          academic_year: '2026',
          term_id: 'term-1',
          academic_year_id: 'year-1',
        },
        error: null,
      };
    }

    throw new Error(`Unexpected query: ${JSON.stringify(state)}`);
  });

  const controller = loadControllerWithMocks({
    supabaseMock: supabase,
    resolveActiveTermImpl: async () => ({
      id: 'term-2',
      academic_year_id: 'year-2',
      name: 'Term 2',
      academic_years: { name: '2027' },
    }),
  });

  const req = {
    userRole: 'admin',
    institution_id: 'inst-1',
    params: { id: 'fee-1' },
    query: {},
    body: {},
  };
  const res = createRes();

  await controller.releaseFeeStructure(req, res);

  assert.equal(res.state.statusCode, 409);
  assert.equal(res.state.body.error, 'Selected academic year and term are not current; strict release blocked');
  assert.equal(updateCalled, false);
});

test('createFeeStructure rejects term_id that does not belong to selected academic_year_id', async () => {
  let insertCalled = false;

  const supabase = createSupabaseMock((state) => {
    if (state.table === 'academic_years' && state.terminal === 'maybeSingle') {
      return {
        data: { id: 'year-1', name: '2026' },
        error: null,
      };
    }

    if (state.table === 'terms' && state.terminal === 'maybeSingle') {
      return {
        data: { id: 'term-9', name: 'Term X', academic_year_id: 'year-2' },
        error: null,
      };
    }

    if (state.table === 'fee_structures' && state.insert) {
      insertCalled = true;
      return { data: null, error: null };
    }

    throw new Error(`Unexpected query: ${JSON.stringify(state)}`);
  });

  const controller = loadControllerWithMocks({
    supabaseMock: supabase,
  });

  const req = {
    userRole: 'admin',
    institution_id: 'inst-1',
    body: {
      title: 'Mismatch Fee',
      amount: 1000,
      academic_year_id: 'year-1',
      term_id: 'term-9',
    },
  };
  const res = createRes();

  await controller.createFeeStructure(req, res);

  assert.equal(res.state.statusCode, 400);
  assert.equal(res.state.body.error, 'term_id does not belong to the selected academic_year_id');
  assert.equal(insertCalled, false);
});

test('releaseFeeStructure allows institution-admin override when strict_current_pair is false', async () => {
  let updatePayload = null;

  const supabase = createSupabaseMock((state) => {
    if (state.table === 'fee_structures' && state.terminal === 'single' && !state.update) {
      return {
        data: {
          id: 'fee-2',
          institution_id: 'inst-1',
          is_active: false,
          term: 'Term 1',
          academic_year: '2026',
          term_id: 'term-1',
          academic_year_id: 'year-1',
          completed_at: null,
          released_at: null,
          status_updated_at: null,
        },
        error: null,
      };
    }

    if (state.table === 'fee_structures' && state.update) {
      updatePayload = state.update;
      return {
        data: {
          id: 'fee-2',
          institution_id: 'inst-1',
          is_active: true,
          term: 'Term 1',
          academic_year: '2026',
          term_id: 'term-1',
          academic_year_id: 'year-1',
          ...state.update,
        },
        error: null,
      };
    }

    throw new Error(`Unexpected query: ${JSON.stringify(state)}`);
  });

  const controller = loadControllerWithMocks({
    supabaseMock: supabase,
    resolveActiveTermImpl: async () => ({
      id: 'term-2',
      academic_year_id: 'year-2',
      name: 'Term 2',
      academic_years: { name: '2027' },
    }),
  });

  const req = {
    userRole: 'school_admin',
    institution_id: 'inst-1',
    params: { id: 'fee-2' },
    query: { strict_current_pair: 'false' },
    body: {},
  };
  const res = createRes();

  await controller.releaseFeeStructure(req, res);

  assert.equal(res.state.statusCode, 200);
  assert.equal(res.state.body.id, 'fee-2');
  assert.equal(res.state.body.is_active, true);
  assert.ok(updatePayload);
});

test('getRevenueOverview allows access when finance role is available but not active', async () => {
  const supabase = createSupabaseMock((state) => {
    if (state.table === 'payments' && state.terminal === 'query') {
      return {
        data: [
          { amount: 300, payment_date: '2026-09-01', status: 'completed' },
          { amount: 200, payment_date: '2026-09-02', status: 'completed' },
        ],
        error: null,
      };
    }

    if (state.table === 'financial_transactions' && state.terminal === 'query') {
      return {
        data: [
          { amount: 50, date: '2026-09-02', created_at: '2026-09-02T08:00:00.000Z', type: 'revenue_deduction', direction: 'outflow', status: 'completed' },
        ],
        error: null,
      };
    }

    throw new Error(`Unexpected query: ${JSON.stringify(state)}`);
  });

  const controller = loadControllerWithMocks({
    supabaseMock: supabase,
  });

  const req = {
    institution_id: 'inst-1',
    userRole: 'teacher',
    user: {
      role: 'teacher',
      active_role: 'teacher',
      available_roles: ['teacher', 'school_admin'],
      roles: [],
    },
  };
  const res = createRes();

  await controller.getRevenueOverview(req, res);

  assert.equal(res.state.statusCode, 200);
  assert.equal(res.state.body.gross_revenue, 500);
  assert.equal(res.state.body.total_deductions, 50);
  assert.equal(res.state.body.net_revenue, 450);
});

test('getRevenueOverview denies users without finance roles', async () => {
  let queryCount = 0;
  const supabase = createSupabaseMock(() => {
    queryCount += 1;
    return { data: [], error: null };
  });

  const controller = loadControllerWithMocks({
    supabaseMock: supabase,
  });

  const req = {
    institution_id: 'inst-1',
    userRole: 'teacher',
    user: {
      role: 'teacher',
      active_role: 'teacher',
      available_roles: ['teacher'],
      roles: [],
    },
  };
  const res = createRes();

  await controller.getRevenueOverview(req, res);

  assert.equal(res.state.statusCode, 403);
  assert.equal(res.state.body.error, 'Unauthorized');
  assert.equal(queryCount, 0);
});

test('getPayments allows access when finance role exists in available roles', async () => {
  const supabase = createSupabaseMock((state) => {
    if (state.table === 'payments' && state.terminal === 'query') {
      return {
        data: [
          {
            id: 'pay-1',
            student_id: 'stu-1',
            amount: 250,
            payment_method: 'cash',
            status: 'completed',
            payment_date: '2026-09-05',
            students: {
              id: 'stu-1',
              users: { first_name: 'Jane', last_name: 'Doe', full_name: 'Jane Doe' },
            },
          },
        ],
        error: null,
      };
    }

    throw new Error(`Unexpected query: ${JSON.stringify(state)}`);
  });

  const controller = loadControllerWithMocks({ supabaseMock: supabase });
  const req = {
    institution_id: 'inst-1',
    userRole: 'teacher',
    user: {
      role: 'teacher',
      active_role: 'teacher',
      available_roles: ['teacher', 'school_admin'],
      roles: [],
    },
  };
  const res = createRes();

  await controller.getPayments(req, res);

  assert.equal(res.state.statusCode, 200);
  assert.equal(Array.isArray(res.state.body), true);
  assert.equal(res.state.body.length, 1);
  assert.equal(res.state.body[0].student_name, 'Jane Doe');
});

test('getPayments denies users without finance roles', async () => {
  let queryCount = 0;
  const supabase = createSupabaseMock(() => {
    queryCount += 1;
    return { data: [], error: null };
  });

  const controller = loadControllerWithMocks({ supabaseMock: supabase });
  const req = {
    institution_id: 'inst-1',
    userRole: 'teacher',
    user: {
      role: 'teacher',
      active_role: 'teacher',
      available_roles: ['teacher'],
      roles: [],
    },
  };
  const res = createRes();

  await controller.getPayments(req, res);

  assert.equal(res.state.statusCode, 403);
  assert.equal(res.state.body.error, 'Unauthorized');
  assert.equal(queryCount, 0);
});

test('getRevenueDeductions allows access when finance role exists in available roles', async () => {
  const supabase = createSupabaseMock((state) => {
    if (state.table === 'financial_transactions' && state.terminal === 'range') {
      return {
        data: [
          {
            id: 'ded-1',
            amount: 125,
            date: '2026-09-04',
            created_at: '2026-09-04T10:30:00.000Z',
            status: 'completed',
            target_label: 'Stationery',
            recorded_by_label: 'Finance Admin',
            meta: { reason: 'Printer ink' },
          },
        ],
        error: null,
      };
    }

    throw new Error(`Unexpected query: ${JSON.stringify(state)}`);
  });

  const controller = loadControllerWithMocks({ supabaseMock: supabase });
  const req = {
    institution_id: 'inst-1',
    userRole: 'teacher',
    query: {},
    user: {
      role: 'teacher',
      active_role: 'teacher',
      available_roles: ['teacher', 'school_admin'],
      roles: [],
    },
  };
  const res = createRes();

  await controller.getRevenueDeductions(req, res);

  assert.equal(res.state.statusCode, 200);
  assert.equal(Array.isArray(res.state.body), true);
  assert.equal(res.state.body.length, 1);
  assert.equal(res.state.body[0].reason, 'Printer ink');
});

test('getRevenueDeductions denies users without finance roles', async () => {
  let queryCount = 0;
  const supabase = createSupabaseMock(() => {
    queryCount += 1;
    return { data: [], error: null };
  });

  const controller = loadControllerWithMocks({ supabaseMock: supabase });
  const req = {
    institution_id: 'inst-1',
    userRole: 'teacher',
    query: {},
    user: {
      role: 'teacher',
      active_role: 'teacher',
      available_roles: ['teacher'],
      roles: [],
    },
  };
  const res = createRes();

  await controller.getRevenueDeductions(req, res);

  assert.equal(res.state.statusCode, 403);
  assert.equal(res.state.body.error, 'Unauthorized');
  assert.equal(queryCount, 0);
});

test('createRevenueDeduction allows access when finance role exists in available roles', async () => {
  const supabase = createSupabaseMock((state) => {
    if (state.table === 'payments' && state.terminal === 'query') {
      return {
        data: [{ amount: 400, payment_date: '2026-09-01', status: 'completed' }],
        error: null,
      };
    }

    if (state.table === 'financial_transactions' && state.terminal === 'query') {
      return {
        data: [],
        error: null,
      };
    }

    if (state.table === 'financial_transactions' && state.insert && state.terminal === 'single') {
      const row = state.insert[0];
      return {
        data: {
          id: 'ded-new',
          amount: row.amount,
          date: row.date,
          created_at: '2026-09-10T10:00:00.000Z',
          status: row.status,
          target_label: row.target_label,
          recorded_by_user_id: row.recorded_by_user_id,
          recorded_by_label: row.recorded_by_label,
          origin_type: row.origin_type,
          origin_id: row.origin_id,
          origin_label: row.origin_label,
          target_type: row.target_type,
          target_id: row.target_id,
          meta: row.meta,
          user_id: row.user_id,
        },
        error: null,
      };
    }

    if (state.table === 'users' && state.terminal === 'maybeSingle') {
      return {
        data: { first_name: 'Finance', last_name: 'Admin', full_name: 'Finance Admin', email: 'finance@example.com' },
        error: null,
      };
    }

    throw new Error(`Unexpected query: ${JSON.stringify(state)}`);
  });

  const controller = loadControllerWithMocks({ supabaseMock: supabase });
  const req = {
    institution_id: 'inst-1',
    userRole: 'teacher',
    userId: 'user-1',
    body: { amount: 100, reason: 'Ink', target: 'Stationery' },
    user: {
      role: 'teacher',
      active_role: 'teacher',
      available_roles: ['teacher', 'school_admin'],
      roles: [],
    },
  };
  const res = createRes();

  await controller.createRevenueDeduction(req, res);

  assert.equal(res.state.statusCode, 201);
  assert.equal(res.state.body.amount, 100);
  assert.equal(res.state.body.reason, 'Ink');
});
