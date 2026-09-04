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

test('borrowBook explicitly disables self-service borrowing with 403', async () => {
  const controller = loadControllerWithMockSupabase({});
  const req = {
    userRole: 'student',
    institution_id: 'inst-1',
    userId: 'user-student-1',
    body: { bookId: 'book-1' }
  };
  const res = createRes();

  await controller.borrowBook(req, res);

  assert.equal(res.state.statusCode, 403);
  assert.equal(res.state.body.code, 'SELF_SERVICE_DISABLED');
  assert.match(res.state.body.error, /Self-service borrowing is disabled/);
});

test('issueBook denies access to users who are neither librarian nor admin', async () => {
  const controller = loadControllerWithMockSupabase({});
  const req = {
    userRole: 'teacher',
    isLibrarian: false,
    user: { is_librarian: false },
    institution_id: 'inst-1',
    userId: 'user-teacher-1',
    body: { bookId: 'book-1', studentId: 'student-1' }
  };
  const res = createRes();

  await controller.issueBook(req, res);

  assert.equal(res.state.statusCode, 403);
  assert.match(res.state.body.error, /Librarian designation required/);
});

test('issueBook blocks librarian from checking out a book to themselves', async () => {
  const mockSupabase = {
    from(table) {
      if (table === 'teachers') {
        return {
          select() { return this; },
          eq() { return this; },
          async maybeSingle() {
            // Target teacher borrower resolves to same user as the acting librarian
            return { data: { user_id: 'user-teacher-librarian-1' }, error: null };
          }
        };
      }
      throw new Error(`Unexpected table ${table}`);
    }
  };

  const controller = loadControllerWithMockSupabase(mockSupabase);
  const req = {
    userRole: 'teacher',
    isLibrarian: true,
    user: { is_librarian: true },
    institution_id: 'inst-1',
    userId: 'user-teacher-librarian-1',
    body: { bookId: 'book-1', teacherId: 'teacher-1' }
  };
  const res = createRes();

  await controller.issueBook(req, res);

  assert.equal(res.state.statusCode, 400);
  assert.match(res.state.body.error, /cannot check out books to themselves/);
});

test('issueBook successfully records issued_by when librarian checks out to a student', async () => {
  let insertedLoan = null;

  const mockSupabase = {
    from(table) {
      if (table === 'students') {
        return {
          select() { return this; },
          eq() { return this; },
          async single() {
            return { data: { id: 'student-1', user_id: 'user-student-99' }, error: null };
          },
          async maybeSingle() {
            return { data: { user_id: 'user-student-99' }, error: null };
          }
        };
      }
      if (table === 'books') {
        return {
          select() { return this; },
          limit() { return this; },
          eq() { return this; },
          is() { return this; },
          async single() {
            return { data: { id: 'book-1', available_quantity: 5 }, error: null };
          }
        };
      }
      if (table === 'enrollments') {
        return {
          select() { return this; },
          eq() { return this; },
          then(resolve) { resolve({ data: [], error: null }); }
        };
      }
      if (table === 'library_config') {
        return {
          select() { return this; },
          eq() { return this; },
          limit() { return this; },
          async maybeSingle() {
            return { data: { min_fee_percent_for_borrow: 0, default_borrow_limit: 5 }, error: null };
          }
        };
      }
      if (table === 'borrowed_books') {
        return {
          select(fields, options) {
            if (options?.head) {
              return {
                is() { return this; },
                eq() { return this; },
                then(resolve) { resolve({ count: 0, error: null }); }
              };
            }
            return {
              is() { return this; },
              lt() { return this; },
              neq() { return this; },
              eq() { return this; },
              then(resolve) { resolve({ data: [], error: null }); }
            };
          },
          insert(rows) {
            insertedLoan = rows[0];
            return {
              select() {
                return {
                  async single() {
                    return { data: { id: 'loan-1', ...insertedLoan }, error: null };
                  }
                };
              }
            };
          }
        };
      }
      throw new Error(`Unexpected table ${table}`);
    }
  };

  const controller = loadControllerWithMockSupabase(mockSupabase);
  const req = {
    userRole: 'teacher',
    isLibrarian: true,
    user: { is_librarian: true },
    institution_id: 'inst-1',
    userId: 'user-librarian-1',
    body: { bookId: 'book-1', studentId: 'student-1', days: 14 }
  };
  const res = createRes();

  await controller.issueBook(req, res);

  assert.equal(res.state.statusCode, 201);
  assert.equal(res.state.body.message, 'Book issued successfully');
  assert.ok(insertedLoan);
  assert.equal(insertedLoan.issued_by, 'user-librarian-1');
  assert.equal(insertedLoan.student_id, 'student-1');
  assert.equal(insertedLoan.teacher_id, null);
  assert.equal(insertedLoan.status, 'borrowed');
});

test('toggleLibrarianDesignation rejects non-main-admin users', async () => {
  const controller = loadControllerWithMockSupabase({});
  const req = {
    userRole: 'teacher',
    isMain: false,
    user: { role: 'teacher', is_main: false },
    institution_id: 'inst-1',
    userId: 'user-teacher-1',
    body: { userId: 'user-teacher-2', action: 'grant' }
  };
  const res = createRes();

  await controller.toggleLibrarianDesignation(req, res);

  assert.equal(res.state.statusCode, 403);
  assert.match(res.state.body.error, /Only the Main Admin can assign or revoke/);
});

test('toggleLibrarianDesignation grants designation and writes audit log', async () => {
  let designationInserted = null;
  let auditLogInserted = null;

  const mockSupabase = {
    from(table) {
      if (table === 'users') {
        return {
          select() { return this; },
          eq() { return this; },
          async single() {
            return {
              data: { id: 'target-teacher-1', full_name: 'Jane Doe', role: 'teacher', institution_id: 'inst-1' },
              error: null
            };
          }
        };
      }
      if (table === 'librarian_designations') {
        return {
          select() { return this; },
          eq() { return this; },
          async maybeSingle() {
            return { data: null, error: null }; // not currently designated
          },
          async insert(rows) {
            designationInserted = rows[0];
            return { error: null };
          }
        };
      }
      if (table === 'librarian_audit_logs') {
        return {
          async insert(rows) {
            auditLogInserted = rows[0];
            return { error: null };
          }
        };
      }
      throw new Error(`Unexpected table ${table}`);
    }
  };

  const controller = loadControllerWithMockSupabase(mockSupabase);
  const req = {
    userRole: 'admin',
    isMain: true,
    user: { role: 'admin', is_main: true, full_name: 'Principal Admin' },
    institution_id: 'inst-1',
    userId: 'main-admin-uuid',
    body: { userId: 'target-teacher-1', action: 'grant', reason: 'Assigned as library head' }
  };
  const res = createRes();

  await controller.toggleLibrarianDesignation(req, res);

  assert.equal(res.state.statusCode, 200);
  assert.equal(res.state.body.is_librarian, true);
  assert.ok(designationInserted);
  assert.equal(designationInserted.user_id, 'target-teacher-1');
  assert.equal(designationInserted.designated_by, 'main-admin-uuid');

  assert.ok(auditLogInserted);
  assert.equal(auditLogInserted.action, 'grant');
  assert.equal(auditLogInserted.target_user_id, 'target-teacher-1');
  assert.equal(auditLogInserted.performed_by, 'main-admin-uuid');
  assert.equal(auditLogInserted.notes, 'Assigned as library head');
});

test('returnBook records returned_by and return_notes when librarian processes return', async () => {
  let updatedLoanPayload = null;
  let bookStockIncremented = false;

  const mockSupabase = {
    from(table) {
      if (table === 'borrowed_books') {
        return {
          select() { return this; },
          eq() { return this; },
          is() { return this; },
          limit() { return this; },
          async maybeSingle() {
            return {
              data: { id: 'borrow-1', book_id: 'book-1', institution_id: 'inst-1', returned_at: null },
              error: null
            };
          },
          update(payload) {
            updatedLoanPayload = payload;
            return {
              eq() { return this; },
              select() {
                return {
                  async single() {
                    return { data: { id: 'borrow-1', ...payload }, error: null };
                  }
                };
              }
            };
          }
        };
      }
      if (table === 'books') {
        return {
          select() {
            return {
              eq() { return this; },
              async single() {
                return { data: { id: 'book-1', available_quantity: 2 }, error: null };
              }
            };
          },
          update() {
            bookStockIncremented = true;
            return {
              eq() { return this; }
            };
          }
        };
      }
      throw new Error(`Unexpected table ${table}`);
    }
  };

  const controller = loadControllerWithMockSupabase(mockSupabase);
  const req = {
    userRole: 'teacher',
    isLibrarian: true,
    user: { is_librarian: true },
    institution_id: 'inst-1',
    userId: 'librarian-returning-user',
    params: { borrowId: 'borrow-1' },
    body: { notes: 'Returned in pristine condition', condition: 'good' }
  };
  const res = createRes();

  await controller.returnBook(req, res);

  assert.equal(res.state.statusCode, 200);
  assert.equal(res.state.body.message, 'Returned');
  assert.ok(updatedLoanPayload);
  assert.equal(updatedLoanPayload.returned_by, 'librarian-returning-user');
  assert.equal(updatedLoanPayload.return_notes, 'Returned in pristine condition');
  assert.equal(updatedLoanPayload.status, 'returned');
  assert.equal(bookStockIncremented, true);
});

test('getAllBorrowedBooks filters by search query and returns enriched circulation list', async () => {
  const sampleRecords = [
    {
      id: 'bb-1',
      book_id: 'b-1',
      books: { title: 'Advanced Calculus', author: 'Stewart', isbn: '978-0-12345' },
      students: { users: { full_name: 'Alice Johnson' } },
      teachers: null,
      issuer: { full_name: 'Mr. Librarian' },
      status: 'borrowed'
    },
    {
      id: 'bb-2',
      book_id: 'b-2',
      books: { title: 'World History', author: 'Roberts', isbn: '978-0-67890' },
      students: null,
      teachers: { users: { full_name: 'Dr. Smith' } },
      issuer: { full_name: 'Mr. Librarian' },
      status: 'returned'
    }
  ];

  const mockSupabase = {
    from(table) {
      if (table === 'borrowed_books') {
        return {
          select() { return this; },
          eq() { return this; },
          order() { return this; },
          then(resolve) { resolve({ data: sampleRecords, error: null }); }
        };
      }
      throw new Error(`Unexpected table ${table}`);
    }
  };

  const controller = loadControllerWithMockSupabase(mockSupabase);
  const req = {
    userRole: 'admin',
    isMain: true,
    user: { role: 'admin', is_main: true },
    institution_id: 'inst-1',
    query: { search: 'Calculus' }
  };
  const res = createRes();

  await controller.getAllBorrowedBooks(req, res);

  assert.equal(res.state.statusCode, 200);
  assert.equal(Array.isArray(res.state.body), true);
  assert.equal(res.state.body.length, 1);
  assert.equal(res.state.body[0].books.title, 'Advanced Calculus');
});

