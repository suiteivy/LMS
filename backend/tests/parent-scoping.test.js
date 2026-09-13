const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const parentControllerPath = path.resolve(__dirname, '../controllers/parent.controller.js');
const reportCardsControllerPath = path.resolve(__dirname, '../controllers/reportCards.controller.js');
const supabaseClientPath = path.resolve(__dirname, '../utils/supabaseClient.js');

function createRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function createSupabaseMock(resolver) {
  return {
    from(table) {
      const state = {
        table,
        filters: [],
        orders: [],
      };

      const builder = {
        select(columns, options) {
          state.select = { columns, options };
          return this;
        },
        order(column, options) {
          state.orders.push({ column, options });
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

test('parentController.getStudentExams rejects requests for non-linked students with 403', async () => {
  const req = {
    params: { studentId: 'student-not-mine' },
    user: {
      id: 'parent-user-1',
      role: 'parent',
      institution_id: 'inst-1',
    },
  };
  const res = createRes();

  const originalSupabase = require(supabaseClientPath);

  const mockSupabase = createSupabaseMock((state) => {
    if (state.table === 'parents') {
      return { data: { id: 'parent-record-1' }, error: null };
    }
    if (state.table === 'parent_students') {
      // Return null: not linked!
      return { data: null, error: null };
    }
    return { data: null, error: null };
  });

  require.cache[supabaseClientPath] = { exports: mockSupabase };
  delete require.cache[parentControllerPath];
  const parentController = require(parentControllerPath);

  await parentController.getStudentExams(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body?.code, 'PARENT_CHILD_ACCESS_DENIED');

  require.cache[supabaseClientPath] = { exports: originalSupabase };
  delete require.cache[parentControllerPath];
});

test('parentController.getStudentExams returns exams when child is linked', async () => {
  const req = {
    params: { studentId: 'student-mine' },
    user: {
      id: 'parent-user-1',
      role: 'parent',
      institution_id: 'inst-1',
    },
  };
  const res = createRes();

  const originalSupabase = require(supabaseClientPath);

  const mockSupabase = createSupabaseMock((state) => {
    if (state.table === 'parents') {
      return { data: { id: 'parent-record-1' }, error: null };
    }
    if (state.table === 'parent_students') {
      return { data: { id: 'rel-1', student_id: 'student-mine' }, error: null };
    }
    if (state.table === 'enrollments') {
      return { data: [{ subject_id: 'sub-1' }], error: null };
    }
    if (state.table === 'class_enrollments') {
      return { data: [{ class_id: 'class-1' }], error: null };
    }
    if (state.table === 'subjects') {
      return { data: [{ id: 'sub-2' }], error: null };
    }
    if (state.table === 'exams') {
      return {
        data: [{ id: 'exam-1', name: 'Midterm Math' }],
        error: null,
      };
    }
    return { data: [], error: null };
  });

  require.cache[supabaseClientPath] = { exports: mockSupabase };
  delete require.cache[parentControllerPath];
  const parentController = require(parentControllerPath);

  await parentController.getStudentExams(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(Array.isArray(res.body?.data), true);
  assert.equal(res.body?.data[0]?.id, 'exam-1');

  require.cache[supabaseClientPath] = { exports: originalSupabase };
  delete require.cache[parentControllerPath];
});

test('reportCards.getReportCards filters by student_id when parent supplies specific child', async () => {
  let filteredStudentId = null;

  const originalSupabase = require(supabaseClientPath);

  const mockSupabase = createSupabaseMock((state) => {
    if (state.table === 'parents') {
      return { data: { id: 'p-1' }, error: null };
    }
    if (state.table === 'parent_students') {
      return {
        data: [{ student_id: 'child-123' }, { student_id: 'child-456' }],
        error: null,
      };
    }
    if (state.table === 'report_cards') {
      const studentFilter = state.filters.find((f) => f.column === 'student_id');
      if (studentFilter) {
        filteredStudentId = studentFilter.value;
      }
      return {
        data: [{ id: 'rc-1', student_id: 'child-123' }],
        error: null,
      };
    }
    return { data: [], error: null };
  });

  require.cache[supabaseClientPath] = { exports: mockSupabase };
  delete require.cache[reportCardsControllerPath];
  const reportCardsController = require(reportCardsControllerPath);

  const req = {
    query: { student_id: 'child-123' },
    user: { id: 'parent-user-1', role: 'parent', institution_id: 'inst-1' },
  };
  const res = createRes();

  await reportCardsController.getReportCards(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(filteredStudentId, 'child-123', 'Query was scoped to specifically chosen child without cross-child leaking');

  require.cache[supabaseClientPath] = { exports: originalSupabase };
  delete require.cache[reportCardsControllerPath];
});
