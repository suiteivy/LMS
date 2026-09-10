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
  const res = {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
  };
  return res;
}

function createCalendarQueryTracker() {
  const tracker = {
    eq: [],
    gte: [],
    lte: [],
    order: [],
  };

  const query = {
    select() {
      return this;
    },
    order(column, options) {
      tracker.order.push({ column, options });
      return this;
    },
    eq(column, value) {
      tracker.eq.push({ column, value });
      return this;
    },
    gte(column, value) {
      tracker.gte.push({ column, value });
      return this;
    },
    lte(column, value) {
      tracker.lte.push({ column, value });
      return this;
    },
    async then(resolve) {
      return resolve({ data: [], error: null });
    },
  };

  return { query, tracker };
}

test('getEvents computes month-end correctly for 28/29/30/31-day months', async () => {
  const cases = [
    { year: 2025, month: 2, expectedEnd: '2025-02-28' },
    { year: 2024, month: 2, expectedEnd: '2024-02-29' },
    { year: 2026, month: 9, expectedEnd: '2026-09-30' },
    { year: 2026, month: 1, expectedEnd: '2026-01-31' },
  ];

  for (const item of cases) {
    const { query, tracker } = createCalendarQueryTracker();
    const mockSupabase = {
      from(table) {
        assert.equal(table, 'calendar_events');
        return query;
      },
    };

    const { getEvents } = loadWithSupabaseMock('../controllers/calendar.controller.js', mockSupabase);
    const req = {
      institution_id: 'inst-1',
      userRole: 'teacher',
      query: { year: item.year, month: item.month },
    };
    const res = createRes();

    await getEvents(req, res);

    assert.equal(res.statusCode, 200);
    assert.ok(tracker.gte.some((entry) => entry.column === 'event_date' && entry.value === `${item.year}-${String(item.month).padStart(2, '0')}-01`));
    assert.ok(tracker.lte.some((entry) => entry.column === 'event_date' && entry.value === item.expectedEnd));
    assert.equal(tracker.lte.some((entry) => entry.value.endsWith('-31') && item.expectedEnd !== entry.value), false);
  }
});

test('getEvents rejects invalid year/month query pairs and values', async () => {
  const { query } = createCalendarQueryTracker();
  const mockSupabase = {
    from() {
      return query;
    },
  };

  const { getEvents } = loadWithSupabaseMock('../controllers/calendar.controller.js', mockSupabase);

  const originalConsoleError = console.error;
  console.error = () => {};

  const invalidInputs = [
    { query: { year: 2026 }, expectedError: 'Both year and month are required together.' },
    { query: { month: 9 }, expectedError: 'Both year and month are required together.' },
    { query: { year: 2026, month: 13 }, expectedError: 'Invalid calendar query parameters.' },
    { query: { year: 'not-a-year', month: 9 }, expectedError: 'Invalid calendar query parameters.' },
  ];

  try {
    for (const item of invalidInputs) {
      const req = {
        institution_id: 'inst-1',
        userRole: 'teacher',
        query: item.query,
      };
      const res = createRes();
      await getEvents(req, res);
      assert.equal(res.statusCode, 400);
      assert.equal(res.payload?.error, item.expectedError);
    }
  } finally {
    console.error = originalConsoleError;
  }
});

test('getEvents rejects invalid start_date and end_date formats', async () => {
  const { query } = createCalendarQueryTracker();
  const mockSupabase = {
    from() {
      return query;
    },
  };

  const { getEvents } = loadWithSupabaseMock('../controllers/calendar.controller.js', mockSupabase);

  const reqBadStart = {
    institution_id: 'inst-1',
    userRole: 'teacher',
    query: { start_date: '2026-09-31' },
  };
  const resBadStart = createRes();
  await getEvents(reqBadStart, resBadStart);
  assert.equal(resBadStart.statusCode, 400);
  assert.equal(resBadStart.payload?.error, 'Invalid start_date format. Expected YYYY-MM-DD.');

  const reqBadEnd = {
    institution_id: 'inst-1',
    userRole: 'teacher',
    query: { end_date: '2026-02-30' },
  };
  const resBadEnd = createRes();
  await getEvents(reqBadEnd, resBadEnd);
  assert.equal(resBadEnd.statusCode, 400);
  assert.equal(resBadEnd.payload?.error, 'Invalid end_date format. Expected YYYY-MM-DD.');
});

test('createEvent rejects impossible event_date values before DB writes', async () => {
  let fromCalled = false;
  const mockSupabase = {
    from() {
      fromCalled = true;
      throw new Error('DB should not be called for invalid date');
    },
  };

  const { createEvent } = loadWithSupabaseMock('../controllers/calendar.controller.js', mockSupabase);

  const req = {
    institution_id: 'inst-1',
    userId: 'admin-1',
    userRole: 'admin',
    body: {
      title: 'Sports Day',
      event_date: '2026-09-31',
    },
  };
  const res = createRes();
  await createEvent(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload?.error, 'Invalid event date format. Expected YYYY-MM-DD.');
  assert.equal(fromCalled, false);
});

test('updateEvent rejects impossible event_date values and skips update', async () => {
  let updateCalled = false;
  const mockSupabase = {
    from(table) {
      assert.equal(table, 'calendar_events');
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
              id: 'ev-1',
              institution_id: 'inst-1',
              title: 'Existing event',
              event_date: '2026-09-30',
            },
            error: null,
          };
        },
        update() {
          updateCalled = true;
          return this;
        },
        async single() {
          return { data: null, error: null };
        },
      };
    },
  };

  const { updateEvent } = loadWithSupabaseMock('../controllers/calendar.controller.js', mockSupabase);
  const req = {
    params: { id: 'ev-1' },
    userRole: 'admin',
    institution_id: 'inst-1',
    body: { event_date: '2026-02-30' },
  };
  const res = createRes();

  await updateEvent(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload?.error, 'Invalid event date format. Expected YYYY-MM-DD.');
  assert.equal(updateCalled, false);
});

test('getEvents falls back when start_time column is missing', async () => {
  let startTimeOrderAttempts = 0;

  const mockSupabase = {
    from(table) {
      assert.equal(table, 'calendar_events');
      const state = { orderedByStartTime: false };

      return {
        select() {
          return this;
        },
        order(column) {
          if (column === 'start_time') {
            state.orderedByStartTime = true;
            startTimeOrderAttempts += 1;
          }
          return this;
        },
        eq() {
          return this;
        },
        gte() {
          return this;
        },
        lte() {
          return this;
        },
        async then(resolve) {
          if (state.orderedByStartTime) {
            return resolve({
              data: null,
              error: { message: 'column start_time does not exist' },
            });
          }

          return resolve({ data: [], error: null });
        },
      };
    },
  };

  const { getEvents } = loadWithSupabaseMock('../controllers/calendar.controller.js', mockSupabase);
  const req = {
    institution_id: 'inst-1',
    userRole: 'teacher',
    query: { year: 2026, month: 9 },
  };
  const res = createRes();

  await getEvents(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.payload, { events: [] });
  assert.equal(startTimeOrderAttempts, 1);
});
