const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const controllerPath = path.resolve(__dirname, '../controllers/library.controller.js');
const supabaseModulePath = path.resolve(__dirname, '../utils/supabaseClient.js');

function loadControllerWithMockSupabase(mockSupabase) {
  delete require.cache[controllerPath];
  delete require.cache[supabaseModulePath];

  require.cache[supabaseModulePath] = {
    id: supabaseModulePath,
    filename: supabaseModulePath,
    loaded: true,
    exports: mockSupabase,
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

test('deleteBook archives a book instead of hard deleting', async () => {
  const calls = { payload: null, filters: [] };

  const mockSupabase = {
    from(table) {
      assert.equal(table, 'books');
      return {
        update(payload) {
          calls.payload = payload;
          return this;
        },
        eq(column, value) {
          calls.filters.push([column, value]);
          return this;
        },
        async is(column, value) {
          calls.filters.push([column, value]);
          return { error: null };
        },
      };
    },
  };

  const controller = loadControllerWithMockSupabase(mockSupabase);
  const req = {
    userRole: 'admin',
    institution_id: 'inst-1',
    params: { bookId: 'book-1' },
  };
  const res = createRes();

  await controller.deleteBook(req, res);

  assert.equal(res.state.statusCode, 200);
  assert.equal(res.state.body.message, 'Book archived');
  assert.ok(calls.payload.archived_at);
  assert.ok(calls.payload.updated_at);
  assert.deepEqual(calls.filters, [
    ['id', 'book-1'],
    ['institution_id', 'inst-1'],
    ['archived_at', null],
  ]);
});

test('sendReminder inserts a notification for borrower user', async () => {
  const calls = { notificationsInsert: null };

  const mockSupabase = {
    from(table) {
      if (table === 'borrowed_books') {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          async single() {
            return {
              data: {
                id: 'bb-1',
                books: { title: 'Algebra I' },
                students: { users: { id: 'user-student-1', full_name: 'Student One' } },
                teachers: null,
              },
              error: null,
            };
          },
        };
      }

      if (table === 'notifications') {
        return {
          async insert(rows) {
            calls.notificationsInsert = rows;
            return { error: null };
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };

  const controller = loadControllerWithMockSupabase(mockSupabase);
  const req = {
    userRole: 'admin',
    institution_id: 'inst-1',
    params: { borrowId: 'bb-1' },
  };
  const res = createRes();

  await controller.sendReminder(req, res);

  assert.equal(res.state.statusCode, 200);
  assert.equal(res.state.body.message, 'Reminder sent');
  assert.equal(Array.isArray(calls.notificationsInsert), true);
  assert.equal(calls.notificationsInsert.length, 1);
  assert.equal(calls.notificationsInsert[0].user_id, 'user-student-1');
  assert.equal(calls.notificationsInsert[0].type, 'warning');
});

test('returnBook scopes updates to institution_id', async () => {
  const calls = {
    borrowedUpdateFilters: [],
    booksSelectFilters: [],
    booksUpdateFilters: [],
  };

  const mockSupabase = {
    from(table) {
      if (table === 'borrowed_books') {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          is() {
            return this;
          },
          limit() {
            return this;
          },
          async maybeSingle() {
            return {
              data: { id: 'bb-1', book_id: 'book-1' },
              error: null,
            };
          },
          update() {
            return {
              eq(column, value) {
                calls.borrowedUpdateFilters.push([column, value]);
                return this;
              },
            };
          },
        };
      }

      if (table === 'books') {
        return {
          select() {
            return {
              eq(column, value) {
                calls.booksSelectFilters.push([column, value]);
                return this;
              },
              async single() {
                return { data: { available_quantity: 2 }, error: null };
              },
            };
          },
          update() {
            return {
              eq(column, value) {
                calls.booksUpdateFilters.push([column, value]);
                return this;
              },
            };
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };

  const controller = loadControllerWithMockSupabase(mockSupabase);
  const req = {
    userRole: 'admin',
    institution_id: 'inst-1',
    userId: 'user-1',
    params: { borrowId: 'bb-1' },
  };
  const res = createRes();

  await controller.returnBook(req, res);

  assert.equal(res.state.statusCode, 200);
  assert.equal(res.state.body.message, 'Returned');
  assert.deepEqual(calls.borrowedUpdateFilters, [
    ['id', 'bb-1'],
    ['institution_id', 'inst-1'],
  ]);
  assert.deepEqual(calls.booksSelectFilters, [
    ['id', 'book-1'],
    ['institution_id', 'inst-1'],
  ]);
  assert.deepEqual(calls.booksUpdateFilters, [
    ['id', 'book-1'],
    ['institution_id', 'inst-1'],
  ]);
});

test('extendDueDate scopes update by institution_id', async () => {
  const calls = {
    updateFilters: [],
  };

  const mockSupabase = {
    from(table) {
      if (table !== 'borrowed_books') {
        throw new Error(`Unexpected table ${table}`);
      }

      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        async single() {
          return {
            data: { id: 'bb-1', status: 'borrowed', returned_at: null, institution_id: 'inst-1' },
            error: null,
          };
        },
        update() {
          return {
            eq(column, value) {
              calls.updateFilters.push([column, value]);
              return this;
            },
            select() {
              return this;
            },
            async single() {
              return {
                data: { id: 'bb-1', due_date: '2026-12-31' },
                error: null,
              };
            },
          };
        },
      };
    },
  };

  const controller = loadControllerWithMockSupabase(mockSupabase);
  const req = {
    userRole: 'admin',
    institution_id: 'inst-1',
    params: { borrowId: 'bb-1' },
    body: { new_due_date: '2026-12-31' },
  };
  const res = createRes();

  await controller.extendDueDate(req, res);

  assert.equal(res.state.statusCode, 200);
  assert.equal(res.state.body.message, 'Extended');
  assert.deepEqual(calls.updateFilters, [
    ['id', 'bb-1'],
    ['institution_id', 'inst-1'],
  ]);
});
