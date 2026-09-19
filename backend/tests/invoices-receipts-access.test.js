const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const controllerPath = path.resolve(__dirname, '../controllers/finance.controller.js');
const supabaseModulePath = path.resolve(__dirname, '../utils/supabaseClient.js');

function createMockSupabase(dbState) {
  return {
    from(table) {
      const query = {
        table,
        filters: [],
      };

      const chain = {
        select(columns) {
          query.columns = columns;
          return this;
        },
        eq(col, val) {
          query.filters.push({ col, val });
          return this;
        },
        order() {
          return this;
        },
        maybeSingle() {
          return Promise.resolve(executeSingle(table, query.filters));
        },
        single() {
          return Promise.resolve(executeSingle(table, query.filters));
        },
        then(resolve, reject) {
          return Promise.resolve(executeList(table, query.filters)).then(resolve, reject);
        }
      };

      return chain;
    }
  };

  function executeSingle(table, filters) {
    const list = dbState[table] || [];
    const match = list.find(row => filters.every(f => row[f.col] === undefined || row[f.col] === f.val));
    if (!match) return { data: null, error: { message: 'Not found' } };
    return { data: match, error: null };
  }

  function executeList(table, filters) {
    const list = dbState[table] || [];
    const matches = list.filter(row => filters.every(f => row[f.col] === undefined || row[f.col] === f.val));
    return { data: matches, error: null };
  }
}

function mockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    send(data) {
      this.body = data;
      return this;
    },
    setHeader(name, val) {
      this.headers[name] = val;
    }
  };
  return res;
}

test('Scoped Access: getStudentInvoices enforces role and linkage boundaries', async () => {
  const dbState = {
    students: [
      { id: 'stud-1', user_id: 'user-stud-1', institution_id: 'inst-1', admission_number: 'ADM001' },
      { id: 'stud-2', user_id: 'user-stud-2', institution_id: 'inst-1', admission_number: 'ADM002' }
    ],
    parents: [
      { id: 'parent-rec-1', user_id: 'user-parent-1', institution_id: 'inst-1' }
    ],
    parent_students: [
      { id: 'link-1', parent_id: 'parent-rec-1', student_id: 'stud-1' }
    ],
    student_fee_invoices: [
      {
        id: 'inv-1',
        institution_id: 'inst-1',
        student_id: 'stud-1',
        invoice_number: 'INV-2026-ADM001-0001',
        gross_amount: 50000.0000001,
        discount_amount: 5000.00,
        net_amount: 45000.0000001,
        paid_amount: 20000.00,
        balance_due: 25000.0000001
      }
    ]
  };

  const originalSupabase = require(supabaseModulePath);
  require.cache[supabaseModulePath] = {
    id: supabaseModulePath,
    filename: supabaseModulePath,
    loaded: true,
    exports: createMockSupabase(dbState)
  };

  delete require.cache[controllerPath];
  const financeController = require(controllerPath);

  try {
    // 1. Student accessing their own invoices -> 200 OK
    const reqOwnStudent = {
      institution_id: 'inst-1',
      userId: 'user-stud-1',
      userRole: 'student',
      params: { studentId: 'stud-1' }
    };
    const resOwn = mockRes();
    await financeController.getStudentInvoices(reqOwnStudent, resOwn);
    assert.equal(resOwn.statusCode, 200);
    assert.equal(resOwn.body.length, 1);
    // Universal numeric correctness: float drift eliminated
    assert.equal(resOwn.body[0].gross_amount, 50000);
    assert.equal(resOwn.body[0].net_amount, 45000);
    assert.equal(resOwn.body[0].balance_due, 25000);

    // 2. Student accessing another student's invoices -> 403 Forbidden
    const reqOtherStudent = {
      institution_id: 'inst-1',
      userId: 'user-stud-1',
      userRole: 'student',
      params: { studentId: 'stud-2' }
    };
    const resOther = mockRes();
    await financeController.getStudentInvoices(reqOtherStudent, resOther);
    assert.equal(resOther.statusCode, 403);

    // 3. Parent accessing linked child's invoices -> 200 OK
    const reqLinkedParent = {
      institution_id: 'inst-1',
      userId: 'user-parent-1',
      userRole: 'parent',
      params: { studentId: 'stud-1' }
    };
    const resParent = mockRes();
    await financeController.getStudentInvoices(reqLinkedParent, resParent);
    assert.equal(resParent.statusCode, 200);
    assert.equal(resParent.body.length, 1);

    // 4. Parent accessing unlinked student's invoices -> 403 Forbidden
    const reqUnlinkedParent = {
      institution_id: 'inst-1',
      userId: 'user-parent-1',
      userRole: 'parent',
      params: { studentId: 'stud-2' }
    };
    const resUnlinked = mockRes();
    await financeController.getStudentInvoices(reqUnlinkedParent, resUnlinked);
    assert.equal(resUnlinked.statusCode, 403);

    // 5. Teacher attempting to access student invoices -> 403 Forbidden
    const reqTeacher = {
      institution_id: 'inst-1',
      userId: 'user-teacher-1',
      userRole: 'teacher',
      params: { studentId: 'stud-1' }
    };
    const resTeacher = mockRes();
    await financeController.getStudentInvoices(reqTeacher, resTeacher);
    assert.equal(resTeacher.statusCode, 403);

    // 6. Finance Admin accessing student invoices -> 200 OK
    const reqAdmin = {
      institution_id: 'inst-1',
      userId: 'user-admin-1',
      userRole: 'bursary',
      params: { studentId: 'stud-2' }
    };
    const resAdmin = mockRes();
    await financeController.getStudentInvoices(reqAdmin, resAdmin);
    assert.equal(resAdmin.statusCode, 200);

  } finally {
    require.cache[supabaseModulePath] = {
      id: supabaseModulePath,
      filename: supabaseModulePath,
      loaded: true,
      exports: originalSupabase
    };
    delete require.cache[controllerPath];
  }
});
