const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const controllerPath = path.resolve(__dirname, '../controllers/class.controller.js');
const supabaseModulePath = path.resolve(__dirname, '../utils/supabaseClient.js');

function createSupabaseMock(resolver) {
  return {
    from(table) {
      const state = { table, filters: [] };
      const builder = {
        select(columns, options) {
          state.select = { columns, options };
          return this;
        },
        eq(column, value) {
          state.filters.push({ op: 'eq', column, value });
          return this;
        },
        order(column, options) {
          state.order = { column, options };
          return this;
        },
        then(onFulfilled, onRejected) {
          return Promise.resolve(resolver(state)).then(onFulfilled, onRejected);
        },
      };
      return builder;
    },
  };
}

function loadControllerWithSupabaseMock(supabaseMock) {
  delete require.cache[controllerPath];
  delete require.cache[supabaseModulePath];

  require.cache[supabaseModulePath] = {
    id: supabaseModulePath,
    filename: supabaseModulePath,
    loaded: true,
    exports: supabaseMock,
  };

  return require(controllerPath);
}

test('getStudentTransfers: normalizes student admission_number from student.id if admission_number is missing', async () => {
  const mockTransfers = [
    {
      id: 'tr-1',
      institution_id: 'a0000000-0000-0000-0000-000000000001',
      student_id: 'STU-001',
      from_class_id: 'c-1',
      to_class_id: 'c-2',
      status: 'pending',
      student: {
        id: 'STU-001',
        admission_number: null,
        user: { full_name: 'Jane Doe', email: 'jane@example.com' },
      },
      from_class: { id: 'c-1', display_name: 'Grade 1 Red' },
      to_class: { id: 'c-2', display_name: 'Grade 1 Blue' },
    },
  ];

  const supabaseMock = createSupabaseMock((state) => {
    if (state.table === 'student_class_transfers') {
      return { data: mockTransfers, error: null };
    }
    return { data: null, error: null };
  });

  const controller = loadControllerWithSupabaseMock(supabaseMock);

  let jsonResult = null;
  const res = {
    json: (data) => {
      jsonResult = data;
    },
    status: () => res,
  };

  try {
    await controller.getStudentTransfers(
      { institution_id: 'a0000000-0000-0000-0000-000000000001', query: {} },
      res
    );

    assert.equal(Array.isArray(jsonResult), true);
    assert.equal(jsonResult.length, 1);
    assert.equal(jsonResult[0].student.admission_number, 'STU-001');
  } finally {
    delete require.cache[controllerPath];
    delete require.cache[supabaseModulePath];
  }
});
