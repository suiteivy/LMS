const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const controllerPath = path.resolve(__dirname, '../controllers/settings.controller.js');
const supabaseModulePath = path.resolve(__dirname, '../utils/supabaseClient.js');
const supabaseRetryModulePath = path.resolve(__dirname, '../utils/supabaseRetry.js');
const axiosModulePath = require.resolve('axios');

function loadControllerWithMocks({ mockSupabase, mockSupabaseRetry, mockAxios } = {}) {
  delete require.cache[controllerPath];
  delete require.cache[supabaseModulePath];
  delete require.cache[supabaseRetryModulePath];
  delete require.cache[axiosModulePath];

  require.cache[supabaseModulePath] = {
    id: supabaseModulePath,
    filename: supabaseModulePath,
    loaded: true,
    exports: mockSupabase || {},
  };

  require.cache[supabaseRetryModulePath] = {
    id: supabaseRetryModulePath,
    filename: supabaseRetryModulePath,
    loaded: true,
    exports: mockSupabaseRetry || {
      withSupabaseRetry: async (fn) => fn(),
      isTransientSupabaseError: () => false,
    },
  };

  if (mockAxios) {
    require.cache[axiosModulePath] = {
      id: axiosModulePath,
      filename: axiosModulePath,
      loaded: true,
      exports: mockAxios,
    };
  }

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

test('getCurrencyRates returns normalized DB value when available', async () => {
  const controller = loadControllerWithMocks({
    mockSupabase: {
      from() {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          maybeSingle: async () => ({
            data: {
              value: {
                KES: '145.5',
                last_updated: '2026-06-28T12:00:00.000Z',
              },
            },
            error: null,
          }),
        };
      },
    },
    mockSupabaseRetry: {
      withSupabaseRetry: async (fn) => fn(),
      isTransientSupabaseError: () => false,
    },
  });

  const res = createRes();
  await controller.getCurrencyRates({}, res);

  assert.equal(res.state.statusCode, 200);
  assert.deepEqual(res.state.body, {
    KES: 145.5,
    last_updated: '2026-06-28T12:00:00.000Z',
  });
});

test('getCurrencyRates returns stale fallback on transient upstream failure', async () => {
  const transientError = new Error('TypeError: fetch failed');

  const controller = loadControllerWithMocks({
    mockSupabaseRetry: {
      withSupabaseRetry: async () => {
        throw transientError;
      },
      isTransientSupabaseError: (err) => err === transientError,
    },
  });

  const res = createRes();
  await controller.getCurrencyRates({}, res);

  assert.equal(res.state.statusCode, 200);
  assert.deepEqual(res.state.body, {
    KES: 130,
    last_updated: null,
    stale: true,
  });
});

test('getCurrencyRates returns fallback on non-transient failure', async () => {
  const fatalError = new Error('permission denied');

  const controller = loadControllerWithMocks({
    mockSupabaseRetry: {
      withSupabaseRetry: async () => {
        throw fatalError;
      },
      isTransientSupabaseError: () => false,
    },
  });

  const res = createRes();
  await controller.getCurrencyRates({}, res);

  assert.equal(res.state.statusCode, 200);
  assert.deepEqual(res.state.body, {
    KES: 130,
    last_updated: null,
  });
});

test('updateCurrencyRates returns stale cached rate on DNS provider failure', async () => {
  const controller = loadControllerWithMocks({
    mockAxios: {
      get: async () => {
        throw Object.assign(new Error('getaddrinfo ENOTFOUND open.er-api.com'), { code: 'ENOTFOUND' });
      },
    },
    mockSupabase: {
      from(table) {
        if (table !== 'currencies') throw new Error('unexpected table');
        return {
          update() { return this; },
          select() { return this; },
          eq() { return this; },
          maybeSingle: async () => ({ data: { usd_rate: 141.2, updated_at: '2026-06-29T00:00:00.000Z' } }),
        };
      },
    },
  });

  const res = createRes();
  await controller.updateCurrencyRates({}, res);

  assert.equal(res.state.statusCode, 200);
  assert.deepEqual(res.state.body, {
    KES: 141.2,
    last_updated: '2026-06-29T00:00:00.000Z',
    stale: true,
    source: 'cache',
  });
});
