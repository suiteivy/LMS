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
